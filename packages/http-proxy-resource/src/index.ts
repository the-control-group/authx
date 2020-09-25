import { EventEmitter } from "events";
import { createServer, Server, IncomingMessage, ServerResponse } from "http";
import { createProxyServer, ServerOptions } from "http-proxy";
import { isEqual, isSuperset } from "@authx/scopes";
import { AuthXKeyCache } from "./AuthXKeyCache";
export { AuthXKeyCache } from "./AuthXKeyCache";
import {
  validateAuthorizationHeader,
  NotAuthorizedError
} from "./validateAuthorizationHeader";
export {
  validateAuthorizationHeader,
  NotAuthorizedError
} from "./validateAuthorizationHeader";

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
  private _cache: AuthXKeyCache;
  public readonly server: Server;

  public constructor(config: Config) {
    super();
    this._config = config;

    this._cache = new AuthXKeyCache(config);
    this._cache.on("error", (error: Error, ...args: any[]) =>
      this.emit("error", error, ...args)
    );
    this._cache.on("ready", (...args: any[]) => this.emit("ready", ...args));

    this._proxy = createProxyServer({});
    this._proxy.on("error", (error: Error, ...args) =>
      this.emit("error", error, ...args)
    );

    this.server = createServer(this._callback);
    this.server.on("listening", () => {
      this._closed = false;
      this._cache.start();
    });
    this.server.on("close", () => {
      this._closing = false;
      this._closed = true;
      this._cache.stop();
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

    let warning = "";

    function send(data?: string): void {
      if (warning) {
        response.setHeader(
          "Warning",
          `299 @authx/http-proxy-resource ${warning}`
        );
      }

      if (request.complete) {
        response.end(data);
      } else {
        request.on("end", () => response.end(data));
        request.resume();
      }
    }

    // Serve the readiness URL.
    if (request.url === (this._config.readinessEndpoint || "/_ready")) {
      if (this._closed || this._closing || !this._cache.keys) {
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

    const keys = this._cache.keys;
    if (!keys) {
      response.setHeader("Cache-Control", "no-cache");
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

      let scopes: null | string[] = null;

      // Extract scopes from the authorization header.
      const authorizationHeader = request.headers.authorization;
      if (authorizationHeader) {
        try {
          const {
            authorizationId,
            authorizationSubject,
            authorizationScopes
          } = await validateAuthorizationHeader(
            this._config.authxUrl,
            keys,
            authorizationHeader
          );

          scopes = authorizationScopes;
          meta.authorizationId = authorizationId;
          meta.authorizationSubject = authorizationSubject;
          meta.authorizationScopes = authorizationScopes;
        } catch (error) {
          if (error instanceof NotAuthorizedError) {
            warning = error.message;
          } else {
            response.setHeader("Cache-Control", "no-cache");
            response.statusCode = 500;
            meta.message = error.message;
            meta.rule = rule;
            send();

            this.emit("request.error", error, meta);
            return;
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
        meta.message =
          "Request handled by custom behavior function." +
          (warning ? ` (${warning})` : "");
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
          response.setHeader("Cache-Control", "no-cache");
          response.statusCode = 401;
          meta.message =
            "Restricting access." + (warning ? ` (${warning})` : "");
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
          response.setHeader("Cache-Control", "no-cache");
          response.statusCode = 403;
          meta.message =
            "Restricting access." + (warning ? ` (${warning})` : "");
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
      meta.message = "Request proxied." + (warning ? ` (${warning})` : "");
      meta.rule = rule;
      meta.behavior = behavior;
      this._proxy.web(request, response, behavior.proxyOptions, error => {
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
    meta.message =
      "No rules matched requested URL." + (warning ? ` (${warning})` : "");
    send();
    this.emit(
      "request.error",
      new Error(`No rules matched requested URL "${request.url}".`),
      meta
    );
  };

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

    return new Promise(resolve => {
      this.server.once("listening", resolve);
      this.server.listen(options);
    });
  }

  public async close(delay: number = 0): Promise<void> {
    if (this._closing) {
      throw new Error("Proxy cannot close because it is already closing.");
    }

    this._closing = true;

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
