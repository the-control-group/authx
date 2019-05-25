import { createHash, randomBytes } from "crypto";
import { URL } from "url";
import EventEmitter from "events";
import fetch from "node-fetch";
import { createServer, Server, IncomingMessage, ServerResponse } from "http";
import Cookies from "cookies";
import { createProxyServer, ServerOptions } from "http-proxy";
import { decode } from "jsonwebtoken";
import { simplify } from "@authx/scopes";

interface Behavior {
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

export default class AuthXClientProxy extends EventEmitter {
  private readonly _config: Config;
  private readonly _proxy: ReturnType<typeof createProxyServer>;
  private _closed: boolean = true;
  private _closing: boolean = false;
  public readonly server: Server;

  public constructor(config: Config) {
    super();
    this._config = config;
    this._proxy = createProxyServer({});
    this._proxy.on("error", error => this.emit("error", error));
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
      behavior: Behavior
    ): void => {
      // Merge `set-cookie` header values with those set by the proxy.
      const setHeader = response.setHeader;
      response.setHeader = function(name, value) {
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

      // Strip out cookies belonging to the proxy.
      if (request.headers.cookie) {
        request.headers.cookie = request.headers.cookie
          .split("; ")
          .filter(cookie => !/^authx\./.test(cookie.split("=")[0]))
          .join("; ");

        if (!request.headers.cookie) delete request.headers.cookie;
      }

      this.emit("handle", {
        request: request,
        response: response,
        rule,
        behavior,
        message: "Request proxied."
      });
      this._proxy.web(request, response, options);
    };

    // Serve the readiness URL.
    if (request.url === (this._config.readinessEndpoint || "/_ready")) {
      if (this._closed || this._closing) {
        response.statusCode = 503;
        this.emit("handle", {
          request: request,
          response: response,
          rule: undefined,
          behavior: undefined,
          message: "Handled by readiness endpoint: NOT READY."
        });
        return send("NOT READY");
      }

      this.emit("handle", {
        request: request,
        response: response,
        rule: undefined,
        behavior: undefined,
        message: "Handled by readiness endpoint: READY."
      });
      response.statusCode = 200;
      return send("READY");
    }

    // Serve the client URL.
    const requestUrl = new URL(
      request.url || "/",
      "http://this-does-not-matter"
    );
    const clientUrl = new URL(this._config.clientUrl);
    if (requestUrl.pathname === clientUrl.pathname) {
      const params = requestUrl.searchParams;

      // Display an error.
      const errors = params.getAll("error");
      if (errors.length) {
        const errorDescriptions = params.getAll("error_description");
        response.statusCode = 400;
        this.emit("handle", {
          request: request,
          response: response,
          rule: undefined,
          behavior: undefined,
          message: "Handled by client endpoint: display oauth errors."
        });
        return send(`
          <html>
            <head><title>Error</title></head>
            <body>
              ${(errors.length === errorDescriptions.length
                ? errorDescriptions
                : errors
              ).map(
                message =>
                  `<div>${message
                    .replace(/&/g, "&amp;")
                    .replace(/</g, "&lt;")
                    .replace(/>/g, "&gt;")
                    .replace(/"/g, "&quot;")
                    .replace(/'/g, "&#039;")}</div>`
              )}
            </body>
          </html>
        `);
      }

      // No code was returned.
      const code = params.get("code");
      if (!code) {
        response.statusCode = 400;
        this.emit("handle", {
          request: request,
          response: response,
          rule: undefined,
          behavior: undefined,
          message: "Handled by client endpoint: display missing code error."
        });
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
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            /* eslint-disable @typescript-eslint/camelcase */
            grant_type: "authorization_code",
            client_id: this._config.clientId,
            client_secret: this._config.clientSecret,
            code: code,
            scope: "**:**:**"
            /* eslint-enable @typescript-eslint/camelcase */
          })
        });

        if (tokenResponse.status !== 200) {
          throw new Error(
            `Received status code of ${tokenResponse.status} from AuthX.`
          );
        }

        const tokenResponseBody = await tokenResponse.json();

        if (tokenResponseBody.error) {
          throw new Error(tokenResponseBody.error);
        }

        // Update the refresh token.
        if (tokenResponseBody.refresh_token) {
          cookies.set("authx.r", tokenResponseBody.refresh_token);
        }

        // Use the new access token.
        if (tokenResponseBody.access_token) {
          cookies.set(
            `authx.t.${hashScopes(["**:**:**"])}`,
            tokenResponseBody.access_token
          );
        }

        response.setHeader("Location", cookies.get("authx.d") || "/");
        response.statusCode = 303;

        // Delete state and destination cookies.
        cookies.set("authx.s");
        cookies.set("authx.d");

        this.emit("handle", {
          request: request,
          response: response,
          rule: undefined,
          behavior: undefined,
          message: "Handled by client endpoint: redirect after successful auth."
        });
        return send();
      } catch (error) {
        this.emit("error", error);
        response.statusCode = 500;
        this.emit("handle", {
          request: request,
          response: response,
          rule: undefined,
          behavior: undefined,
          message: "Handled by client endpoint: display fetch error."
        });
        return send(`
          <html>
            <head><title>Error</title></head>
            <body>
              <div>Error fetching access token from AuthX.</div>
            </body>
          </html>
        `);
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
        const payload = token && decode(token);
        if (
          payload &&
          typeof payload === "object" &&
          typeof payload.exp === "number" &&
          payload.exp >
            Date.now() / 1000 + (this._config.tokenMinimumRemainingLife || 30)
        ) {
          // We already have a valid token.
          request.headers.authorization = `Bearer ${token}`;
          forward(behavior.proxyOptions, rule, behavior);
          return;
        }
      } catch (error) {
        this.emit("error", error);
      }

      const refreshToken = cookies.get("authx.r");
      if (refreshToken) {
        try {
          const refreshResponse = await fetch(this._config.authxUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              /* eslint-disable @typescript-eslint/camelcase */
              grant_type: "refresh_token",
              client_id: this._config.clientId,
              client_secret: this._config.clientSecret,
              refresh_token: refreshToken,
              scope: scopes.join(" ")
              /* eslint-enabme @typescript-eslint/camelcase */
            })
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

          // Update the refresh token.
          if (
            refreshResponseBody.refresh_token &&
            refreshResponseBody.refresh_token !== refreshToken
          ) {
            cookies.set("authx.r", refreshResponseBody.refresh_token);
          }

          // Use the new access token.
          if (refreshResponseBody.access_token) {
            cookies.set(`authx.t.${hash}`, refreshResponseBody.access_token);
            request.headers.authorization = `Bearer ${
              refreshResponseBody.access_token
            }`;

            forward(behavior.proxyOptions, rule, behavior);
            return;
          }
        } catch (error) {
          this.emit("error", error);
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
        this._config.requestGrantedScopes.join(" ")
      );
      location.searchParams.append("state", state);
      response.setHeader("Location", location.href);
      response.statusCode = behavior.sendAuthorizationResponseAs || 303;
      this.emit("handle", {
        request: request,
        response: response,
        rule,
        behavior,
        message: "Restricting access."
      });
      return send();
    }

    this.emit(
      "error",
      new Error(`No rules matched requested URL "${request.url}".`)
    );

    this.emit("handle", {
      request: request,
      response: response,
      behavior: undefined,
      message: "No rules matched requested URL."
    });
    response.statusCode = 404;
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
      this.server.once("listening", () => {
        this.emit("ready");
        resolve();
      });
      this.server.listen(port);
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
