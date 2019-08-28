import AbortController from "abort-controller";
import EventEmitter from "events";
import fetch from "node-fetch";
import { createServer, Server, IncomingMessage, ServerResponse } from "http";
import { createProxyServer, ServerOptions } from "http-proxy";
import { verify, TokenExpiredError } from "jsonwebtoken";
import { validate, isEqual, isSuperset } from "@authx/scopes";

interface Behavior {
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
   * If set to true, proxied requests will retain the token in their HTTP
   * `Authorization` header. Only valid tokens will be sent to the target.
   *
   * @defaultValue `false`
   */
  readonly sendTokenToTarget?: boolean;

  /**
   * The minimum scopes required for a request to be proxied.
   *
   * @remarks
   * If one or more scopes are configured, the proxy will ensure that they are
   * provided by a valid token, returning a 401 for a missing or invalid token,
   * and a 403 for a valid token that is missing required scopes. The header
   * `X-OAuth-Required-Scopes` will be set on both the request and response,
   * containing a space-deliminated list of the required scopes.
   *
   * To ensure that a valid token is present, use an empty array.
   *
   * If this option is not set, all requests will be proxied to the target.
   */
  readonly requireScopes?: string[];
}

interface Rule {
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

interface Config {
  /**
   * The root URL to AuthX server.
   */
  readonly authxUrl: string;

  /**
   * The number of seconds between successful attempts at refreshing public keys
   * from the AuthX server.
   *
   * @defaultValue `60`
   */
  readonly authxPublicKeyRefreshInterval?: number;

  /**
   * The number of seconds to wait before aborting and retrying a request for
   * public keys from the AuthX server.
   *
   * @defaultValue `30`
   */
  readonly authxPublicKeyRefreshRequestTimeout?: number;

  /**
   * The number of seconds between failed attempts at refreshing public keys
   * from the AuthX server.
   *
   * @defaultValue `10`
   */
  readonly authxPublicKeyRetryInterval?: number;

  /**
   * The number of seconds for which the proxy will cache the AuthX server's
   * token introspection response for a revocable token.
   *
   * @defaultValue `60`
   */
  readonly revocableTokenCacheDuration?: number;

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
   * @defaultValue `"/_ready"`
   */
  readonly readinessEndpoint?: string;

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
  authorizationId: undefined | string;
  authorizationSubject: undefined | string;
  authorizationScopes: undefined | ReadonlyArray<string>;
}

export default class AuthXResourceProxy extends EventEmitter {
  private readonly _config: Config;
  private readonly _proxy: ReturnType<typeof createProxyServer>;
  private _closed: boolean = true;
  private _closing: boolean = false;
  private _keys: null | ReadonlyArray<string> = null;
  private _fetchTimeout: null | ReturnType<typeof setTimeout> = null;
  private _fetchAbortController: null | AbortController = null;
  private _fetchAbortTimeout: null | ReturnType<typeof setTimeout> = null;
  public readonly server: Server;

  public constructor(config: Config) {
    super();
    this._config = config;
    this._proxy = createProxyServer({});
    this._proxy.on("error", (...args) => this.emit("error", ...args));
    this.server = createServer(this._callback);
    this.server.on("listening", () => {
      this._closed = false;
      this._fetchKeys();
    });
    this.server.on("close", () => {
      this._closing = false;
      this._closed = true;
    });
  }

  private _fetchKeys = async (): Promise<void> => {
    this._fetchTimeout = null;

    // Don't fetch keys if we're closed or closing.
    if (this._closed || this._closing) {
      return;
    }

    this._fetchAbortController = new AbortController();
    this._fetchAbortTimeout = setTimeout(() => {
      if (this._fetchAbortController) {
        this._fetchAbortController.abort();
      }
    }, (this._config.authxPublicKeyRefreshRequestTimeout || 30) * 1000);

    try {
      // Fetch the keys from AuthX.
      // FIXME: This should not need to be cast through any. See:
      // https://github.com/DefinitelyTyped/DefinitelyTyped/pull/35636
      const response = await (await fetch(this._config.authxUrl + "/graphql", {
        signal: this._fetchAbortController.signal,
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: '{"query": "query { keys }"}'
      } as any)).json();

      // Make sure we don't have any errors.
      if (response.errors && response.errors[0])
        throw new Error(response.errors[0]);

      if (!response.data || !response.data.keys) {
        throw new Error("The response from AuthX is missing keys.");
      }

      const keys: string[] = response.data.keys;

      // Ensure that there is at least one valid key in the response.
      if (
        !keys ||
        !Array.isArray(keys) ||
        !keys.length ||
        !keys.every(k => typeof k === "string")
      ) {
        throw new Error("An array of least one key must be returned by AuthX.");
      }

      // Cache the keys.
      this._keys = keys;

      // Fire off a ready event.
      if (!this._closed && !this._closing) {
        this.emit("ready");
      }

      // Fetch again in 1 minute.
      this._fetchTimeout = setTimeout(
        this._fetchKeys,
        (this._config.authxPublicKeyRefreshInterval || 60) * 1000
      );
    } catch (error) {
      this.emit("error", error);

      // Fetch again in 10 seconds.
      this._fetchTimeout = setTimeout(
        this._fetchKeys,
        (this._config.authxPublicKeyRetryInterval || 10) * 1000
      );
    } finally {
      this._fetchAbortController = null;
      clearTimeout(this._fetchAbortTimeout);
      this._fetchAbortTimeout = null;
    }
  };

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
      authorizationId: undefined,
      authorizationSubject: undefined,
      authorizationScopes: undefined
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
      if (this._closed || this._closing || !this._keys) {
        response.statusCode = 503;
        meta.message = "Request handled by readiness endpoint: NOT READY.";
        send("NOT READY");
        return;
      }

      response.statusCode = 200;
      meta.message = "Request handled by readiness endpoint: READY.";
      send("READY");
      return;
    }

    const keys = this._keys;
    if (!keys) {
      response.statusCode = 503;
      meta.message = "Unable to find keys.";
      send();
      return;
    }

    // Proxy
    for (const rule of this._config.rules) {
      if (!rule.test(request)) {
        continue;
      }

      // Extract the token from the authorization header.
      const token =
        request.headers.authorization &&
        request.headers.authorization.replace(/^BEARER\s+/i, "");

      // Try each public key.
      let scopes: null | string[] = null;
      if (token) {
        for (const key of keys) {
          try {
            // Verify the token against the key.
            const payload = verify(token, key, {
              algorithms: ["RS512"]
            }) as string | { sub?: string; aid?: string; scopes: string[] };

            // Ensure the token payload is correctly formatted.
            if (
              typeof payload !== "object" ||
              !Array.isArray(payload.scopes) ||
              !payload.scopes.every(
                scope => typeof scope === "string" && validate(scope)
              )
            ) {
              // This should never happen; if it does, it means that either:
              // - The AuthX server generated a malformed token.
              // - The private key has been compromised and was used to sign
              //   a malformed token.
              this.emit(
                "error",
                new Error(
                  "A cryptographically verified token contained a malformed payload."
                )
              );
              break;
            }

            scopes = payload.scopes;
            meta.authorizationScopes = scopes;

            if (typeof payload.aid === "string") {
              meta.authorizationId = payload.aid;
            }

            if (typeof payload.sub === "string") {
              meta.authorizationSubject = payload.sub;
            }
          } catch (error) {
            // The token is expired; there's no point in trying to verify
            // against additional public keys.
            if (error instanceof TokenExpiredError) {
              break;
            }

            // Keep trying public keys.
            continue;
          }
        }
      }

      // Set scopes on the request.
      if (scopes) {
        request.headers["X-OAuth-Scopes"] = scopes.join(" ");
        response.setHeader("X-OAuth-Scopes", scopes.join(" "));
      } else {
        delete request.headers["X-OAuth-Scopes"];
        response.removeHeader("X-OAuth-Scopes");
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

      if (behavior.requireScopes) {
        request.headers[
          "X-OAuth-Required-Scopes"
        ] = behavior.requireScopes.join(" ");
        response.setHeader(
          "X-OAuth-Required-Scopes",
          behavior.requireScopes.join(" ")
        );

        // There is no valid token.
        if (!scopes) {
          response.statusCode = 401;
          meta.message = "Restricting access.";
          meta.rule = rule;
          meta.behavior = behavior;
          send();
          return;
        }

        // The token is valid, but lacks required scopes.
        if (
          !isEqual(scopes, behavior.requireScopes) &&
          !isSuperset(scopes, behavior.requireScopes)
        ) {
          response.statusCode = 403;
          meta.message = "Restricting access.";
          meta.rule = rule;
          meta.behavior = behavior;
          send();
          return;
        }
      }

      // Strip the token from the proxied request.
      if (!behavior.sendTokenToTarget || !scopes) {
        delete request.headers.authorization;
      }

      // Proxy the request.
      meta.message = "Request proxied.";
      meta.rule = rule;
      meta.behavior = behavior;
      this._proxy.web(request, response, behavior.proxyOptions);

      return;
    }

    this.emit(
      "error",
      new Error(`No rules matched requested URL "${request.url}".`)
    );
    response.statusCode = 404;
    meta.message = "No rules matched requested URL.";
    send();
  };

  public async listen(port?: number): Promise<void> {
    if (!this._closed) {
      throw new Error("Proxy cannot listen because it not closed.");
    }

    if (this._closing) {
      throw new Error("Proxy cannot listen because it is closing.");
    }

    return new Promise(resolve => {
      this.server.once("listening", resolve);
      this.server.listen(port);
    });
  }

  public async close(delay: number = 0): Promise<void> {
    if (this._closing) {
      throw new Error("Proxy cannot close because it is already closing.");
    }

    this._closing = true;

    // Abort any in-flight key requests.
    const abort = this._fetchAbortController;
    if (abort) {
      abort.abort();
    }

    // Close the proxy.
    return new Promise(resolve => {
      setTimeout(() => {
        this.server.close(() => {
          resolve();
        });
      }, delay);
    });
  }
}
