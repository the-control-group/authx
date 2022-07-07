import { EventEmitter } from "events";

interface FetchConfig {
  method: "POST";
  headers: {
    "Content-Type": "application/json";
    Authorization: string;
  };
  body: string;
}

export interface FetchFunction {
  (uri: string, conf: FetchConfig): Promise<FetchResponse>;
}

interface FetchResponse {
  status: number;
  json(): Promise<any>;
}

interface TokenDataCacheConfig {
  fetchFunc: FetchFunction;
  timeSource: () => number;
  tokenRefreshSeconds: number;
  tokenExpirySeconds: number;
  authxUrl: string;
}

export interface TokenData {
  access: string[];
  id: string;
  user: {
    id: string;
  };
}

class NoTokenError extends Error {}

class TokenDataCacheEntry {
  private lastRefreshRequestTime: number;
  private lastValidRefreshTime: number | null = null;
  private forceRefresh: boolean = false;

  private currentToken: Promise<TokenData> | null = null;
  private nextToken: Promise<TokenData> | null = null;

  constructor(
    private basicToken: string,
    private conf: TokenDataCacheConfig,
    private errorHandler: (err: Error) => void
  ) {
    this.lastRefreshRequestTime = Date.now();
  }

  get token(): Promise<TokenData> {
    if (this.currentToken === null) {
      this.startFetchNextToken();
      this.currentToken = this.nextToken;
    } else if (
      this.forceRefresh ||
      (this.conf.timeSource() - this.lastRefreshRequestTime) / 1_000 >
        this.conf.tokenRefreshSeconds
    ) {
      this.startFetchNextToken();
    }

    if (!this.currentToken)
      throw new Error("currentToken was unexpectedly null");
    return this.currentToken;
  }

  get secondsSinceLastRefresh(): number {
    return (
      (this.conf.timeSource() -
        (this.lastValidRefreshTime ?? this.lastRefreshRequestTime)) /
      1_000
    );
  }

  private startFetchNextToken(): void {
    this.nextToken = this.fetchNextToken();
    this.nextToken.then(
      () => {
        this.currentToken = this.nextToken;
        this.lastValidRefreshTime = this.conf.timeSource();
      },
      (err) => {
        if (err instanceof NoTokenError) {
          // This error is cachable, so replace the cache with it
          this.currentToken = this.nextToken;
          this.lastValidRefreshTime = this.conf.timeSource();
        } else {
          this.forceRefresh = true;
        }
        this.errorHandler(err);
      }
    );
    this.lastRefreshRequestTime = this.conf.timeSource();
  }

  private async fetchNextToken(): Promise<TokenData> {
    const response = await this.conf.fetchFunc(
      `${this.conf.authxUrl}/graphql`,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: this.basicToken,
        },
        method: "POST",
        body: JSON.stringify({
          query: "query { viewer { access id user { id } } }",
        }),
      }
    );

    if (![200, 401].includes(response.status)) {
      throw new Error(`Unexpected response code from AuthX ${response.status}`);
    }

    const responseJson = await response.json();

    const ret = responseJson?.data?.viewer;

    if (!ret) throw new NoTokenError("Response did not include a valid token");
    if (!Array.isArray(ret?.access))
      throw new NoTokenError("Response did not include scopes");
    if (!ret?.id)
      throw new NoTokenError("Response did not include an authorization id");
    if (!ret?.user?.id)
      throw new NoTokenError("Response did not include a user id");

    return ret;
  }
}

export class TokenDataCache extends EventEmitter {
  private cache = new Map<string, TokenDataCacheEntry>();

  constructor(private conf: TokenDataCacheConfig) {
    super();
  }

  getToken(basicToken: string): Promise<TokenData> {
    for (const k of [...this.cache.keys()]) {
      const cacheValue = this.cache.get(k);
      if (
        cacheValue &&
        cacheValue.secondsSinceLastRefresh > this.conf.tokenExpirySeconds
      ) {
        this.cache.delete(k);
      }
    }

    if (!this.cache.has(basicToken)) {
      this.cache.set(
        basicToken,
        new TokenDataCacheEntry(basicToken, this.conf, (err) => {
          // Only trigger the error event on truly unexpected errors. Other cases are simply handled as auth failures
          if (!(err instanceof NoTokenError)) {
            this.emit("error", err);
          }
        })
      );
    }

    const ret = this.cache.get(basicToken)?.token;
    if (!ret)
      throw new Error(
        "Unexpectedly unable to find TokenDataCacheEntry, cache is invalid"
      );

    return ret;
  }
}
