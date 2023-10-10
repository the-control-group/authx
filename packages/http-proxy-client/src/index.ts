import { createHash } from "crypto";
import AbortController from "abort-controller";
import { EventEmitter } from "events";
import fetch from "node-fetch";
import { createServer, Server, IncomingMessage, ServerResponse } from "http";
import { createProxyServer, ServerOptions } from "http-proxy";
import { decode } from "jsonwebtoken";

export interface Behavior {
  /**
   * The options to pass to node-proxy.
   *
   * @remarks
   * The HTTP header `X-OAuth-Scopes` will be set on both the request and
   * response, containing a space-deliminated list of authorized scopes from a
   * valid token.
   *
   * If a valid token contains no scopes, the `X-OAuth-Scopes` will be an empty
   * string.
   *
   * If no token exists, or the token is invalid, the `X-OAuth-Scopes` will be
   * removed from both the request and response.
   */
  readonly proxyOptions: ServerOptions;

  /**
   * The refresh token to use when requesting an access token from AuthX.
   */
  readonly refreshToken?: string;

  /**
   * Pass a token to the target, restricting scopes to those provided.
   *
   * @remarks
   * If unspecified, the proxy will forward the request to the target without a
   * token, whether the user has authenticated the client or not. To only ensure
   * the user is authenticated and has authorized the client in some capacity,
   * use an empty array here.
   *
   * This is generally used to limit the token to the scopes needed by the
   * request. For example, if we are authorized to:
   *
   * - lunch:apple:eat
   * - recess:ball:throw
   *
   * ...and we want to send a token to the "cafeteria" resource that _only_ has
   * access to "lunch" resources, we can limit it with: [ "lunch:**:**" ]
   *
   * * @defaultValue `[]`
   */
  readonly sendTokenToTargetWithScopes?: string[];

  /**
   * Format (BEARER or BASIC) of tokens that the proxy will request from AuthX and pass to the
   * the resource.
   *
   * If unspecified, the format BEARER will be used.
   */
  readonly tokenFormat?: "BASIC" | "BEARER";
}

export interface Rule {
  /**
   * Each rule is tested in order, with the first to return `true` used to
   * handle the request. This function MUST NOT manipulate the `request` object.
   */
  readonly test: (request: IncomingMessage) => boolean;

  /**
   * The behavior to use for a matching request.
   *
   * @remarks
   * If the request must be modified, such as to change the URL path, a custom
   * function can be used here. This function will be called _after_ the
   * `X-OAuth-Scopes` headers have been set or removed.
   *
   * If the function handles the request (such as returning an error), it must
   * return `undefined` to prevent the proxy from also attempting to handle it;
   * otherwise, it should return a `Behavior` config.
   */
  readonly behavior:
    | Behavior
    | ((
        request: IncomingMessage,
        response: ServerResponse
      ) => Behavior | undefined);
}

export interface Config {
  /**
   * The root URL to AuthX server.
   */
  readonly authxUrl: string;

  /**
   * The ID assigned to this client by AuthX.
   */
  readonly clientId: string;

  /**
   * A secret assigned to this client by AuthX.
   */
  readonly clientSecret: string;

  /**
   * The pathname at which the proxy will provide a readiness check.
   *
   * @remarks
   * Requests to this path will return a 200 with the body "READY" when the
   * proxy is ready to accept incoming connections, and a 503 with the body
   * "NOT READY" otherwise.
   *
   * When closing the proxy, readiness checks will immediately begin failing,
   * even before the proxy stops accepting requests.
   *
   * If not set, the path `/_ready` will be used.
   */
  readonly readinessEndpoint?: string;

  /**
   * Cached access tokens will be refreshed this amount of time in seconds
   * before they would otherwise expire.
   *
   * @defaultValue `60`
   */
  readonly refreshCachedTokensAtRemainingLife?: number;

  /**
   * The number of seconds to wait before aborting and retrying a request for
   * an access token from the AuthX server.
   *
   * @defaultValue `30`
   */
  readonly refreshCachedTokensRequestTimeout?: number;

  /**
   * The number of seconds between failed attempts at refreshing access tokens
   * from the AuthX server.
   *
   * @defaultValue `10`
   */
  readonly refreshCachedTokensRetryInterval?: number;

  /**
   * When a token is unused for this amount of time in seconds, it will be
   * removed from the cache, and no longer kept fresh.
   *
   * @defaultValue `600`
   */
  readonly evictDormantCachedTokensThreshold?: number;

  /**
   * Format of tokens that we will request from AuthX and use.
   * Can be either BEARER or BASIC.
   * If not set, assumes BEARER.
   */
  readonly tokenFormat?: string;

  /**
   * The rules the proxy will use to handle a request.
   */
  readonly rules: Rule[];
}

export interface Metadata {
  request: IncomingMessage;
  response: ServerResponse;
  rule: undefined | Rule;
  behavior: undefined | Behavior;
  message: string;
}

/**
 * Generate a consistent string representation of a scopes array.
 */
function hashScopes(scopes: ReadonlyArray<string>): string {
  return createHash("sha1")
    .update([...scopes].sort().join(" "))
    .digest("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

export default class AuthXClientProxy extends EventEmitter {
  private readonly _config: Config;
  private readonly _proxy: ReturnType<typeof createProxyServer>;
  private _closed: boolean = true;
  private _closing: boolean = false;

  /**
   * Cached access tokens.
   */
  private _accessTokens: {
    [refreshToken: string]: {
      [hash: string]: string;
    };
  } = Object.create(null);

  /**
   * A request fetches fresh access tokens from AuthX.
   */
  private _requests: {
    [refreshToken: string]: {
      [hash: string]: {
        promise: Promise<string>;
        controller: AbortController;
        timeout: ReturnType<typeof setTimeout>;
      };
    };
  } = Object.create(null);

  /**
   * A refresh timeout is responsible for initiating a request to AuthX that
   * replaces a nearly-stale token with a fresh one.
   */
  private _refreshTimeouts: {
    [refreshToken: string]: {
      [hash: string]: ReturnType<typeof setTimeout>;
    };
  } = Object.create(null);

  /**
   * An eviction timeout is responsible for preventing tokens from being
   * refreshed indefinately, if they are not being used. It clears any running
   * refresh timeouts for a token, aborts in-flight any requests, and removes
   * the token from the cache.
   */
  private _evictionTimeouts: {
    [refreshToken: string]: {
      [hash: string]: ReturnType<typeof setTimeout>;
    };
  } = Object.create(null);

  /**
   * An expiration timeout is responsible for removing expired tokens from the
   * cache. This prevents expired tokens from being sent downstream, and instead
   * causes requests to wait on a refresh request.
   */
  private _expirationTimeouts: {
    [refreshToken: string]: {
      [hash: string]: ReturnType<typeof setTimeout>;
    };
  } = Object.create(null);

  public readonly server: Server;

  public constructor(config: Config) {
    super();
    this._config = config;
    this._proxy = createProxyServer({});
    this._proxy.on("error", (error: Error, ...args) =>
      this.emit("error", error, ...args)
    );
    this.server = createServer(this._callback);
    this.server.on("listening", () => {
      this._closed = false;
    });
    this.server.on("close", () => {
      this._closing = false;
      this._closed = true;
    });
  }

  private _callback = async (
    request: IncomingMessage,
    response: ServerResponse
  ): Promise<void> => {
    const meta: Metadata = {
      request: request,
      response: response,
      rule: undefined,
      behavior: undefined,
      message: "Request received.",
    };

    // Emit meta on request start.
    this.emit("request.start", meta);

    // Emit meta again on request finish.
    response.on("finish", () => {
      this.emit("request.finish", meta);
    });

    function send(data?: string): void {
      if (request.complete) {
        response.end(data);
      } else {
        request.on("end", () => response.end(data));
        request.resume();
      }
    }

    // Serve the readiness URL.
    if (request.url === (this._config.readinessEndpoint || "/_ready")) {
      if (this._closed || this._closing) {
        response.setHeader("Cache-Control", "no-cache");
        response.statusCode = 503;
        meta.message = "Request handled by readiness endpoint: NOT READY.";
        send("NOT READY");
        return;
      }

      response.setHeader("Cache-Control", "no-cache");
      response.statusCode = 200;
      meta.message = "Request handled by readiness endpoint: READY.";
      send("READY");
      return;
    }

    // Proxy
    for (const rule of this._config.rules) {
      if (!rule.test(request)) {
        continue;
      }

      // Call the custom behavior function.
      const behavior =
        typeof rule.behavior === "function"
          ? rule.behavior(request, response)
          : rule.behavior;

      // If behavior is undefined, then the custom behavior function will handle
      // responding to the request.
      if (!behavior) {
        meta.message = "Request handled by custom behavior function.";
        meta.rule = rule;
        return;
      }

      // Inject the access token into the request.
      if (behavior.refreshToken) {
        try {
          request.headers.authorization = `${
            this.tokenPrefix
          } ${await this._getAccessToken(
            behavior.refreshToken,
            behavior.sendTokenToTargetWithScopes || []
          )}`;
        } catch (error) {
          response.setHeader("Cache-Control", "no-cache");
          response.statusCode = 503;
          meta.message =
            error instanceof Error
              ? `ERROR: ${error.message}`
              : "Error fetching access token.";
          meta.rule = rule;
          meta.behavior = behavior;
          send();

          this.emit("request.error", error, meta);
          return;
        }
      }

      // Proxy the request.
      meta.message = "Request proxied.";
      meta.rule = rule;
      meta.behavior = behavior;
      this._proxy.web(request, response, behavior.proxyOptions, (error) => {
        if (!response.headersSent) {
          const code = (error as any).code;
          const statusCode =
            typeof code === "string" && /INVALID/.test(code)
              ? 502
              : code === "ECONNRESET" ||
                code === "ENOTFOUND" ||
                code === "ECONNREFUSED"
              ? 504
              : 500;

          response.setHeader("Cache-Control", "no-cache");
          response.writeHead(statusCode);
          response.end();
        }

        this.emit("request.error", error, meta);
      });

      return;
    }

    response.setHeader("Cache-Control", "no-cache");
    response.statusCode = 404;
    meta.message = "No rules matched requested URL.";
    send();

    this.emit(
      "request.error",
      new Error(`No rules matched requested URL "${request.url}".`),
      meta
    );
    return;
  };

  private _evict(refreshToken: string, hash: string): void {
    // Remove the token from the cache.
    if (this._accessTokens[refreshToken]) {
      delete this._accessTokens[refreshToken][hash];
      if (!Object.keys(this._accessTokens[refreshToken]).length) {
        delete this._accessTokens[refreshToken];
      }
    }

    // Abort any in-flight requests.
    if (this._requests[refreshToken] && this._requests[refreshToken][hash]) {
      this._requests[refreshToken][hash].controller.abort();
      delete this._requests[refreshToken][hash];
      if (!Object.keys(this._requests[refreshToken]).length) {
        delete this._requests[refreshToken];
      }
    }

    // Clear any refresh timeouts.
    if (this._refreshTimeouts[refreshToken]) {
      delete this._refreshTimeouts[refreshToken][hash];
      if (!Object.keys(this._refreshTimeouts[refreshToken]).length) {
        delete this._refreshTimeouts[refreshToken];
      }
    }

    // Clear any eviction timeouts. (IE, remove itself.)
    if (this._evictionTimeouts[refreshToken]) {
      delete this._evictionTimeouts[refreshToken][hash];
      if (!Object.keys(this._evictionTimeouts[refreshToken]).length) {
        delete this._evictionTimeouts[refreshToken];
      }
    }

    // Clear any expiration timeouts.
    if (this._expirationTimeouts[refreshToken]) {
      delete this._expirationTimeouts[refreshToken][hash];
      if (!Object.keys(this._expirationTimeouts[refreshToken]).length) {
        delete this._expirationTimeouts[refreshToken];
      }
    }
  }

  /**
   * Get an access token, either from cache or AuthX.
   *
   * @param refreshToken - The refresh token used to fetch the access token.
   * @param scopes - The scopes that should be included the access token contain.
   */
  private _getAccessToken(
    refreshToken: string,
    scopes: ReadonlyArray<string>
  ): Promise<string> {
    const hash = hashScopes(scopes);

    // Clear any eviction timeout.
    if (
      this._evictionTimeouts[refreshToken] &&
      this._evictionTimeouts[refreshToken][hash]
    ) {
      clearTimeout(this._evictionTimeouts[refreshToken][hash]);
    }

    // Create a new eviction timeout.
    this._evictionTimeouts[refreshToken] =
      this._evictionTimeouts[refreshToken] || Object.create(null);
    this._evictionTimeouts[refreshToken][hash] = setTimeout(
      () => this._evict(refreshToken, hash),
      (this._config.evictDormantCachedTokensThreshold || 600) * 1000
    );

    // Return a result from cache if it exists.
    if (
      this._accessTokens[refreshToken] &&
      this._accessTokens[refreshToken][hash]
    ) {
      return Promise.resolve(this._accessTokens[refreshToken][hash]);
    }

    // Otherwise, fetch a new access token and return its promise.
    return this._fetchAccessToken(refreshToken, scopes, false);
  }

  /**
   * Fetch a fresh access token.
   *
   * @param refreshToken - The refresh token used to fetch the access token.
   * @param scopes - The scopes that should be included the access token contain.
   * @param retry - Should we retry on failure? This should be set to false when
   * the `refreshToken` is unknown to prevent amplification attacks.
   */
  private _fetchAccessToken(
    refreshToken: string,
    scopes: ReadonlyArray<string>,
    retry: boolean
  ): Promise<string> {
    const hash = hashScopes(scopes);

    // If a request is already in flight, use it.
    if (this._requests[refreshToken] && this._requests[refreshToken][hash]) {
      return this._requests[refreshToken][hash].promise;
    }

    // Clear any refresh timeout for this token.
    if (
      this._refreshTimeouts[refreshToken] &&
      this._refreshTimeouts[refreshToken][hash]
    ) {
      clearTimeout(this._refreshTimeouts[refreshToken][hash]);
      delete this._refreshTimeouts[refreshToken][hash];
      if (!Object.keys(this._refreshTimeouts[refreshToken]).length) {
        delete this._refreshTimeouts[refreshToken];
      }
    }

    // Create a new abort controller.
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      controller.abort();
    }, (this._config.refreshCachedTokensRequestTimeout || 30) * 1000);
    const request = {
      controller,
      timeout,
      promise: (async () => {
        try {
          const refreshResponse = await fetch(this._config.authxUrl, {
            method: "POST",
            signal: controller.signal,
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              /* eslint-disable camelcase */
              grant_type: "refresh_token",
              client_id: this._config.clientId,
              client_secret: this._config.clientSecret,
              token_format: this._config.tokenFormat,
              refresh_token: refreshToken,
              scope: scopes.join(" "),
              /* eslint-enable camelcase */
            }),
          });

          if (refreshResponse.status !== 200) {
            throw new Error(
              `Received status code of ${refreshResponse.status} from AuthX.`
            );
          }

          const refreshResponseBody = await refreshResponse.json();
          if (refreshResponseBody.error) {
            throw new Error(
              refreshResponseBody.error_message || refreshResponseBody.error
            );
          }

          // Because `refreshResponse.json()` is async and not abortable, it's
          // possible that the an abort was attempted. Check that here.
          if (controller.signal.aborted) {
            throw new Error("Request aborted.");
          }

          const accessToken = refreshResponseBody.access_token;
          if (!accessToken) {
            throw new Error("No access token returned.");
          }

          // This code is designed to make sure we keep track of when tokens will expire, and refresh them before they do.
          // BASIC tokens never expire, so this is not applicable to them.
          if (refreshResponseBody.token_type?.toLowerCase() === "bearer") {
            const payload = decode(accessToken);
            if (!payload || typeof payload !== "object") {
              throw new Error("Invalid token payload.");
            }

            const expiration = payload.exp;
            if (typeof expiration !== "number") {
              throw new Error("Invalid token expiration.");
            }

            const expiresInSeconds = expiration - Math.floor(Date.now() / 1000);
            const refreshInSeconds =
              expiresInSeconds -
              (this._config.refreshCachedTokensAtRemainingLife || 60);

            if (refreshInSeconds < 0) {
              throw new Error("Token is too close to its expiration.");
            }

            // Set an expiration timeout.
            this._expirationTimeouts[refreshToken] =
              this._expirationTimeouts[refreshToken] || Object.create(null);
            if (this._expirationTimeouts[refreshToken][hash]) {
              clearTimeout(this._expirationTimeouts[refreshToken][hash]);
            }
            this._expirationTimeouts[refreshToken][hash] = setTimeout(() => {
              if (
                this._accessTokens[refreshToken] &&
                this._accessTokens[refreshToken][hash] === accessToken
              ) {
                delete this._accessTokens[refreshToken][hash];
              }
            }, refreshInSeconds * 1000);

            // Set a refresh timeout.
            this._refreshTimeouts[refreshToken] =
              this._refreshTimeouts[refreshToken] || Object.create(null);
            if (this._refreshTimeouts[refreshToken][hash]) {
              clearTimeout(this._refreshTimeouts[refreshToken][hash]);
            }
            this._refreshTimeouts[refreshToken][hash] = setTimeout(
              () => this._fetchAccessToken(refreshToken, scopes, true),
              refreshInSeconds * 1000
            );
          }

          // Cache the access token.
          this._accessTokens[refreshToken] =
            this._accessTokens[refreshToken] || Object.create(null);
          this._accessTokens[refreshToken][hash] = accessToken;

          return accessToken;
        } catch (error) {
          // Remove this promise from the cache.
          if (this._accessTokens[refreshToken]) {
            delete this._accessTokens[refreshToken][hash];
            if (!Object.keys(this._accessTokens[refreshToken]).length) {
              delete this._accessTokens[refreshToken];
            }
          }

          // Emit the error so that it can be logged.
          this.emit("error", error);

          // Retry the request.
          // TODO: Detect scenarios where the request will never succeed (such as
          // using incorrect credentials), and don't retry those.
          if (retry) {
            this._refreshTimeouts[refreshToken] =
              this._refreshTimeouts[refreshToken] || Object.create(null);
            if (this._refreshTimeouts[refreshToken][hash]) {
              clearTimeout(this._refreshTimeouts[refreshToken][hash]);
            }
            this._refreshTimeouts[refreshToken][hash] = setTimeout(
              () => this._fetchAccessToken(refreshToken, scopes, true),
              (this._config.refreshCachedTokensRetryInterval || 10) * 1000
            );
          }

          // Propagate the error to anything that is awaiting this promise.
          throw error;
        } finally {
          // Clear the timeout.
          clearTimeout(timeout);

          // Remove the request.
          if (
            this._requests[refreshToken] &&
            this._requests[refreshToken][hash] &&
            this._requests[refreshToken][hash].controller === controller
          ) {
            delete this._requests[refreshToken][hash];
            if (!Object.keys(this._requests[refreshToken]).length) {
              delete this._requests[refreshToken];
            }
          }
        }
      })(),
    };

    // Store the request.
    this._requests[refreshToken] = this._requests[refreshToken] || Object.create(null);
    this._requests[refreshToken][hash] = request;
    return request.promise;
  }

  public async listen(
    options?:
      | number
      | {
          port: number;
          host?: string;
          path?: string;
          backlog?: number;
          exclusive?: boolean;
          readableAll?: boolean;
          writableAll?: boolean;
          ipv6Only?: boolean;
        }
  ): Promise<void> {
    if (!this._closed) {
      throw new Error("Proxy cannot listen because it not closed.");
    }

    if (this._closing) {
      throw new Error("Proxy cannot listen because it is closing.");
    }

    return new Promise((resolve) => {
      this.server.once("listening", resolve);
      this.server.listen(options);
    });
  }

  public async close(delay: number = 0): Promise<void> {
    if (this._closing) {
      throw new Error("Proxy cannot close because it is already closing.");
    }

    this._closing = true;

    // Empty the cache.
    this._accessTokens = {};

    // Abort any in-flight requests.
    for (const map of Object.values(this._requests)) {
      for (const { controller } of Object.values(map)) {
        controller.abort();
      }
    }
    this._requests = {};

    // Clear refresh timeouts.
    for (const map of Object.values(this._refreshTimeouts)) {
      for (const timeout of Object.values(map)) {
        clearTimeout(timeout);
      }
    }
    this._refreshTimeouts = {};

    // Clear eviction timeouts.
    for (const map of Object.values(this._evictionTimeouts)) {
      for (const timeout of Object.values(map)) {
        clearTimeout(timeout);
      }
    }
    this._evictionTimeouts = {};

    // Clear expiration timeouts.
    for (const map of Object.values(this._expirationTimeouts)) {
      for (const timeout of Object.values(map)) {
        clearTimeout(timeout);
      }
    }
    this._expirationTimeouts = {};

    // Close the proxy.
    return new Promise((resolve) => {
      setTimeout(() => {
        this.server.close(() => {
          resolve();
        });
      }, delay);
    });
  }

  /**
   * Gets the type of token we are using to communicate with the backend, in the context
   * where undefined is not a valid value.
   * @private
   */
  private get tokenPrefix(): string {
    if (this._config.tokenFormat == "BASIC") return "Basic";
    return "Bearer";
  }
}
