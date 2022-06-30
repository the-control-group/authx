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

interface BearerTokenCacheConfig {
  fetchFunc: FetchFunction;
  timeSource: () => number;
  tokenRefreshSeconds: number;
  tokenExpirySeconds: number;
  authxUrl: string;
}

class NoTokenError extends Error {}

class BearerTokenCacheEntry {
  private lastRefreshRequestTime: number;
  private lastSuccessfulRefreshTime: number | null = null;
  private forceRefresh: boolean = false;

  private currentToken: Promise<string> | null = null;
  private nextToken: Promise<string> | null = null;

  constructor(
    private basicToken: string,
    private conf: BearerTokenCacheConfig,
    private errorHandler: (err: Error) => void
  ) {
    this.lastRefreshRequestTime = Date.now();
  }

  get token(): Promise<string> {
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

    return this.currentToken!;
  }

  get secondsSinceLastRefresh() {
    return (
      (this.conf.timeSource() -
        (this.lastSuccessfulRefreshTime ?? this.lastRefreshRequestTime)) /
      1_000
    );
  }

  private startFetchNextToken() {
    this.nextToken = this.fetchNextToken();
    this.nextToken.then(
      () => {
        this.currentToken = this.nextToken;
        this.lastSuccessfulRefreshTime = this.conf.timeSource();
      },
      (err) => {
        this.errorHandler(err);
        this.forceRefresh = true;
      }
    );
    this.lastRefreshRequestTime = this.conf.timeSource();
  }

  private async fetchNextToken(): Promise<string> {
    const response = await this.conf.fetchFunc(
      `${this.conf.authxUrl}/graphql`,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: this.basicToken,
        },
        method: "POST",
        body: JSON.stringify({
          query: "query { viewer { token(format:BEARER) } }",
        }),
      }
    );

    const responseJson = await response.json();

    const ret = responseJson?.data?.viewer?.token;

    if (!ret) {
      if ([200, 401].includes(response.status)) {
        // This almost certainly means that the user passed an invalid BASIC token
        // Since this is not really an error, we handle this case specially
        throw new NoTokenError(`Response did not include a valid token.`);
      } else {
        throw new Error(
          `Unexpected response code from AuthX ${response.status}`
        );
      }
    }

    return ret;
  }
}

export class BearerTokenCache extends EventEmitter {
  private cache = new Map<string, BearerTokenCacheEntry>();

  constructor(private conf: BearerTokenCacheConfig) {
    super();
  }

  getBearerToken(basicToken: string) {
    for (const k of [...this.cache.keys()]) {
      if (
        this.cache.get(k)!.secondsSinceLastRefresh >
        this.conf.tokenExpirySeconds
      ) {
        this.cache.delete(k);
      }
    }

    if (!this.cache.has(basicToken)) {
      this.cache.set(
        basicToken,
        new BearerTokenCacheEntry(basicToken, this.conf, (err) => {
          // Only trigger the error event on truly unexpected errors. Other cases are simply handled as auth failures
          if (!(err instanceof NoTokenError)) {
            this.emit("error", err);
          }
        })
      );
    }

    return this.cache.get(basicToken)!.token;
  }
}
