import { createHash, randomBytes } from "crypto";
import { URL } from "url";
import { EventEmitter } from "events";
import fetch from "node-fetch";
import { createServer, Server, IncomingMessage, ServerResponse } from "http";
import Cookies from "cookies";
import httpProxy, {ServerOptions} from "http-proxy";
import { decode } from "jsonwebtoken";
import { simplify } from "@authx/scopes";

const { createProxyServer } = httpProxy
export interface Behavior {
  /**
   * The options to pass to node-proxy.
   */
  readonly proxyOptions: ServerOptions;

  /**
   * The HTTP status to use if the proxy requires authorization.
   *
   * @remarks
   * 303 - This will return a 303 to redirect the browser to AuthX for
   * authorization. After authorizing the proxy, the user will be returned to
   * the requested page if the initial request was a GET request, or to the URL
   * set in the referer header. Use this for endpoints with which a human user
   * directly interacts.
   *
   * 401 - This will return a 401 with a `Location` header designating the AuthX
   * URL to which the user should be directed for authorization. After
   * authorizing the proxy, the user will be returned to the URL set in the
   * referer header. Use this for endpoints with which a client-side app
   * interacts using `fetch` or `XMLHttpRequest`.
   */
  readonly sendAuthorizationResponseAs?: 303 | 401;

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
   */
  readonly sendTokenToTargetWithScopes?: string[];
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
        response: ServerResponse,
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
   * The URL at which the proxy will provide the OAuth client functionality.
   */
  readonly clientUrl: string;

  /**
   * The scopes to request from the user.
   */
  readonly requestGrantedScopes: string[];

  /**
   * Format (BEARER or BASIC) of tokens that the proxy will request from AuthX
   * and pass to the the resource.
   *
   * If unspecified, the format BEARER will be used.
   */
  readonly tokenFormat?: "BASIC" | "BEARER";

  // TODO: eventually we will want the ability to _require_ that certain scopes
  // are granted. Take, for example, an app that required scopes A and B. Now it
  // also wants C. Without checking the _granted_ scopes, there is no way to
  // distinguish between someone who has no access to C, and someone who has
  // never been asked to grant access to C.

  // readonly requireGrantedScopes?: string[];

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
   * If unspecified, the path `/_ready` will be used.
   */
  readonly readinessEndpoint?: string;

  /**
   * When the proxy injects a token into a request, it makes sure that the token
   * will remain valid for this amount of time in seconds; otherwise it will
   * request a new token from AuthX to use.
   *
   * If unspecified, 30 seconds will be used.
   */
  readonly tokenMinimumRemainingLife?: number;

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

// We need a small key to identify this tokey that is safe for use as a cookie
// key. We'll use a modified version of base64, as described by:
// https://tools.ietf.org/html/rfc4648
function hashScopes(scopes: ReadonlyArray<string>): string {
  return createHash("sha1")
    .update([...scopes].sort().join(" "))
    .digest("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

export default class AuthXWebProxy extends EventEmitter {
  private readonly _config: Config;
  private readonly _proxy: ReturnType<typeof createProxyServer>;
  private _closed: boolean = true;
  private _closing: boolean = false;
  public readonly server: Server;

  public constructor(config: Config) {
    super();
    this._config = config;
    this._proxy = createProxyServer({});
    this._proxy.on("error", (error: Error, ...args) =>
      this.emit("error", error, ...args),
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
    response: ServerResponse,
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

    const cookies = new Cookies(request, response);

    function send(data?: string): void {
      if (request.complete) {
        response.end(data);
      } else {
        request.on("end", () => response.end(data));
        request.resume();
      }
    }

    const forward = (
      options: ServerOptions,
      rule: Rule,
      behavior: Behavior,
      hash?: string,
    ): void => {
      // Merge `set-cookie` header values with those set by the proxy.
      const setHeader = response.setHeader;
      response.setHeader = function (name, value) {
        if (name.toLowerCase() === "set-cookie") {
          const setCookie = response.getHeader("set-cookie");

          // Only write the `set-cookie` header if cookiePathRewrite is
          // configured, or else we risk leaking credentials between targets.
          if (Array.isArray(value) && options.cookiePathRewrite) {
            value = Array.isArray(setCookie) ? [...value, ...setCookie] : value;
          } else {
            value = Array.isArray(setCookie) ? setCookie : [];
          }
        }

        return setHeader.call(response, name, value);
      };

      // If the resource returns with a 401 and hash is provided, it typically
      // means that the authorization has insufficient priviliges or has been
      // revoked. Either way, it should be removed from cache.
      let statusCode = 404;
      Object.defineProperty(response, "statusCode", {
        get: () => statusCode,
        set: (code: number) => {
          if (code === 401 && hash) {
            cookies.set(`authx.t.${hash}`);
          }

          statusCode = code;
          return statusCode;
        },
      });

      // Strip out cookies belonging to the proxy.
      if (request.headers.cookie) {
        request.headers.cookie = request.headers.cookie
          .split("; ")
          .filter((cookie) => !/^authx\./.test(cookie.split("=")[0]))
          .join("; ");

        if (!request.headers.cookie) delete request.headers.cookie;
      }

      meta.message = "Request proxied.";
      meta.rule = rule;
      meta.behavior = behavior;
      this._proxy.web(request, response, options, (error) => {
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
    };

    // Serve the readiness URL.
    if (request.url === (this._config.readinessEndpoint || "/_ready")) {
      if (this._closed || this._closing) {
        response.setHeader("Cache-Control", "no-cache");
        response.statusCode = 503;
        meta.message = "Request handled by readiness endpoint: NOT READY.";
        return send("NOT READY");
      }

      meta.message = "Request handled by readiness endpoint: READY.";
      response.setHeader("Cache-Control", "no-cache");
      response.statusCode = 200;
      return send("READY");
    }

    // Serve the client URL.
    const requestUrl = new URL(
      request.url || "/",
      "http://this-does-not-matter",
    );
    const clientUrl = new URL(this._config.clientUrl);
    if (requestUrl.pathname === clientUrl.pathname) {
      const params = requestUrl.searchParams;

      // Display an error.
      const errors = params.getAll("error");
      if (errors.length) {
        const errorDescriptions = params.getAll("error_description");
        response.setHeader("Cache-Control", "no-cache");
        response.statusCode = 400;
        meta.message =
          "Request handled by client endpoint: display oauth errors.";
        return send(`
          <html>
            <head><title>Error</title></head>
            <body>
              ${(errors.length === errorDescriptions.length
                ? errorDescriptions
                : errors
              ).map(
                (message) =>
                  `<div>${message
                    .replace(/&/g, "&amp;")
                    .replace(/</g, "&lt;")
                    .replace(/>/g, "&gt;")
                    .replace(/"/g, "&quot;")
                    .replace(/'/g, "&#039;")}</div>`,
              )}
            </body>
          </html>
        `);
      }

      // Incorrect state.
      const state = params.get("state");
      if (!state || state !== cookies.get("authx.s")) {
        response.setHeader("Cache-Control", "no-cache");
        response.statusCode = 400;
        meta.message =
          "Request handled by client endpoint: display incorrect state error.";
        return send(`
          <html>
            <head><title>Error</title></head>
            <body>
              <div>The <span style="font-family: mono;">state</span> parameter is incorrect.</div>
            </body>
          </html>
        `);
      }

      // No code was returned.
      const code = params.get("code");
      if (!code) {
        response.setHeader("Cache-Control", "no-cache");
        response.statusCode = 400;
        meta.message =
          "Request handled by client endpoint: display missing code error.";
        return send(`
          <html>
            <head><title>Error</title></head>
            <body>
              <div>The <span style="font-family: mono;">code</span> parameter is missing from the OAuth 2.0 response.</div>
            </body>
          </html>
        `);
      }

      try {
        const tokenResponse = await fetch(this._config.authxUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            /* eslint-disable camelcase */
            grant_type: "authorization_code",
            client_id: this._config.clientId,
            client_secret: this._config.clientSecret,
            code: code,
            token_format: this._config.tokenFormat,
            scope: this._config.requestGrantedScopes.join(" "),
            /* eslint-enable camelcase */
          }),
        });

        if (tokenResponse.status !== 200) {
          throw new Error(
            `Received status code of ${tokenResponse.status} from AuthX.`,
          );
        }

        const tokenResponseBody = await tokenResponse.json();
        if (
          typeof tokenResponseBody !== "object" ||
          tokenResponseBody === null
        ) {
          throw new Error(`Invalid token response returned from AuthX.`);
        }

        if (
          "error" in tokenResponseBody &&
          typeof tokenResponseBody.error === "string"
        ) {
          throw new Error(tokenResponseBody.error);
        }

        // Update the refresh token.
        if (
          "refresh_token" in tokenResponseBody &&
          typeof tokenResponseBody.refresh_token === "string"
        ) {
          cookies.set("authx.r", tokenResponseBody.refresh_token);
        }

        response.setHeader("Location", cookies.get("authx.d") || "/");
        response.setHeader("Cache-Control", "no-cache");
        response.statusCode = 303;

        // Delete state and destination cookies.
        cookies.set("authx.s");
        cookies.set("authx.d");

        meta.message =
          "Request handled by client endpoint: redirect after successful auth.";
        return send();
      } catch (error) {
        response.setHeader("Cache-Control", "no-cache");
        response.statusCode = 500;
        meta.message =
          "Request handled by client endpoint: display fetch error.";
        send(`
          <html>
            <head><title>Error</title></head>
            <body>
              <div>Error fetching access token from AuthX.</div>
            </body>
          </html>
        `);

        this.emit("request.error", error);
        return;
      }
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

      // If behavior is `undefined`, then the custom function will handle responding
      // to the request.
      if (!behavior) {
        meta.message = "Request handled by custom behavior function.";
        meta.rule = rule;
        return;
      }

      // Nothing else to do; proxy the request.
      if (!behavior.sendTokenToTargetWithScopes) {
        forward(behavior.proxyOptions, rule, behavior);
        return;
      }

      const scopes = behavior.sendTokenToTargetWithScopes
        ? simplify(behavior.sendTokenToTargetWithScopes)
        : [];

      const hash = hashScopes(scopes);

      try {
        const token = cookies.get(`authx.t.${hash}`);

        // Use a BASIC token.
        if (token && this._config.tokenFormat == "BASIC") {
          request.headers.authorization = `${this.tokenPrefix} ${token}`;
          forward(behavior.proxyOptions, rule, behavior, hash);
          return;
        }

        // Use a BEARER token.
        const payload = token && decode(token);
        if (
          payload &&
          typeof payload === "object" &&
          typeof payload.exp === "number" &&
          payload.exp >
            Date.now() / 1000 + (this._config.tokenMinimumRemainingLife || 30)
        ) {
          request.headers.authorization = `${this.tokenPrefix} ${token}`;
          forward(behavior.proxyOptions, rule, behavior);
          return;
        }
      } catch (error) {
        this.emit("request.error", error, meta);
      }

      const refreshToken = cookies.get("authx.r");
      if (refreshToken) {
        try {
          const refreshResponse = await fetch(this._config.authxUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              /* eslint-disable camelcase */
              grant_type: "refresh_token",
              client_id: this._config.clientId,
              client_secret: this._config.clientSecret,
              refresh_token: refreshToken,
              token_format: this._config.tokenFormat,
              scope: scopes.join(" "),
              /* eslint-enabme camelcase */
            }),
          });

          if (refreshResponse.status !== 200) {
            throw new Error(
              `Received status code of ${refreshResponse.status} from AuthX.`,
            );
          }

          const refreshResponseBody = await refreshResponse.json();
          if (
            typeof refreshResponseBody !== "object" ||
            refreshResponseBody === null
          ) {
            throw new Error(`Invalid refresh response returned from AuthX.`);
          }

          if ("error" in refreshResponseBody) {
            throw new Error(
              "error_message" in refreshResponseBody &&
              typeof refreshResponseBody.error_message === "string"
                ? refreshResponseBody.error_message
                : typeof refreshResponseBody.error === "string"
                  ? refreshResponseBody.error
                  : "Unknown error reported by AuthX",
            );
          }

          // Update the refresh token.
          if (
            "refresh_token" in refreshResponseBody &&
            typeof refreshResponseBody.refresh_token === "string" &&
            refreshResponseBody.refresh_token !== refreshToken
          ) {
            cookies.set("authx.r", refreshResponseBody.refresh_token);
          }

          // Use the new access token.
          if (
            "access_token" in refreshResponseBody &&
            typeof refreshResponseBody.access_token === "string"
          ) {
            cookies.set(`authx.t.${hash}`, refreshResponseBody.access_token);
            request.headers.authorization = `${this.tokenPrefix} ${refreshResponseBody.access_token}`;

            forward(behavior.proxyOptions, rule, behavior);
            return;
          }
        } catch (error) {
          this.emit("request.error", error, meta);
        }
      }

      // We need to authorize the client.
      const state = randomBytes(16).toString("hex");
      const destination =
        behavior.sendAuthorizationResponseAs === 401
          ? request.headers.referer || "/"
          : (request.method !== "GET" && request.headers.referer) ||
            request.url ||
            "/";

      cookies.set("authx.s", state);
      cookies.set("authx.d", destination);

      const location = new URL(this._config.authxUrl);
      location.searchParams.append("response_type", "code");
      location.searchParams.append("client_id", this._config.clientId);
      location.searchParams.append("redirect_uri", this._config.clientUrl);
      location.searchParams.append(
        "scope",
        this._config.requestGrantedScopes.join(" "),
      );
      location.searchParams.append("state", state);
      response.setHeader("Location", location.href);
      response.setHeader("Cache-Control", "no-cache");
      response.statusCode = behavior.sendAuthorizationResponseAs || 303;
      meta.message = "Restricting access.";
      meta.rule = rule;
      meta.behavior = behavior;
      return send();
    }

    meta.message = "No rules matched requested URL.";
    response.setHeader("Cache-Control", "no-cache");
    response.statusCode = 404;
    send();

    this.emit(
      "request.error",
      new Error(`No rules matched requested URL "${request.url}".`),
      meta,
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
        },
  ): Promise<void> {
    if (!this._closed) {
      throw new Error("Proxy cannot listen because it not closed.");
    }

    if (this._closing) {
      throw new Error("Proxy cannot listen because it is closing.");
    }

    return new Promise((resolve) => {
      this.server.once("listening", () => {
        this.emit("ready");
        resolve();
      });
      this.server.listen(options);
    });
  }

  public async close(delay: number = 0): Promise<void> {
    if (this._closing) {
      throw new Error("Proxy cannot close because it is already closing.");
    }

    this._closing = true;

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
