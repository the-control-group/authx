import { createHash, randomBytes } from "crypto";
import { URL } from "url";
import EventEmitter from "events";
import fetch from "node-fetch";
import { createServer, Server, IncomingMessage, ServerResponse } from "http";
import Cookies from "cookies";
import { createProxyServer } from "http-proxy";
import { decode } from "jsonwebtoken";
import { simplify, isSuperset } from "@authx/scopes";

interface Behavior {
  readonly proxyTarget: string;
  readonly sendAuthorizationResponseAs: 303 | 407;
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
   * The exact URL as set on `IncomingMessage` at which the proxy will provide
   * the OAuth client functionality.
   */
  readonly clientId: string;
  readonly clientSecret: string;
  readonly clientUrl: string;
  readonly requestGrantedScopes: string[];
  readonly requireGrantedScopes?: string[];

  /**
   * The exact URL as set on `IncomingMessage` at which the proxy will provide
   * a readiness check.
   *
   * @remarks
   * If set, requests to this URL will return a 200 with the body "READY" when
   * the proxy is ready to accept incoming connections, and a 503 with the body
   * "NOT READY" otherwise.
   *
   * When closing the proxy, readiness checks will immediately begin failing,
   * even before the proxy stops accepting requests.
   */
  readonly readinessUrl?: string;
  readonly tokenMinimumRemainingLife?: number;

  /**
   * The rules the proxy will use to handle a request.
   */
  readonly rules: Rule[];
}

function send303(request: IncomingMessage, response: ServerResponse): void {}

function send307(request: IncomingMessage, response: ServerResponse): void {}

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
    // Serve the readiness URL.
    if (
      this._config.readinessUrl &&
      request.url === this._config.readinessUrl
    ) {
      if (this._closed || this._closing) {
        response.statusCode = 503;

        // TODO: this shouldn't need to be cast through any
        // https://github.com/DefinitelyTyped/DefinitelyTyped/pull/34898
        if ((request as any).complete) {
          response.end("NOT READY");
        } else {
          request.on("end", () => response.end("NOT READY"));
          request.resume();
        }

        return;
      }

      response.statusCode = 200;

      // TODO: this shouldn't need to be cast through any
      // https://github.com/DefinitelyTyped/DefinitelyTyped/pull/34898
      if ((request as any).complete) {
        response.end("READY");
      } else {
        request.on("end", () => response.end("READY"));
        request.resume();
      }

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

      // If behavior is `void`, then the custom function will handle responding
      // to the request.
      if (!behavior) {
        return;
      }

      const cookies = new Cookies(request, response);

      // Nothing else to do; proxy the request.
      if (!behavior.sendTokenToTargetWithScopes) {
        // Strip cookies from the request.
        delete request.headers.cookie;

        this._proxy.web(request, response, {
          target: behavior.proxyTarget
        });

        return;
      }

      const scopes = behavior.sendTokenToTargetWithScopes
        ? simplify(behavior.sendTokenToTargetWithScopes)
        : [];

      // We need a small key to identify this tokey that is safe for use as a
      // cookie key. We'll use a modified version of base64, as described by:
      // https://tools.ietf.org/html/rfc4648
      const hash = createHash("sha1")
        .update(scopes.join(" "))
        .digest("base64")
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/g, "");

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

          // Strip cookies from the request.
          delete request.headers.cookie;
          this._proxy.web(request, response, {
            target: behavior.proxyTarget
          });

          return;
        }
      } catch (error) {
        console.error(error);
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
          if (refreshResponseBody.authorization_token) {
            cookies.set(
              `authx.t.${hash}`,
              refreshResponseBody.authorization_token
            );
            request.headers.authorization = `Bearer ${
              refreshResponseBody.authorization_token
            }`;

            // Strip cookies from the request.
            delete request.headers.cookie;
            this._proxy.web(request, response, {
              target: behavior.proxyTarget
            });
          }
        } catch (error) {
          console.error(error);
        }
      }

      // We need to authorize the client.
      const state = randomBytes(16).toString("hex");
      const destination =
        behavior.sendAuthorizationResponseAs === 407
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
      response.statusCode = behavior.sendAuthorizationResponseAs;

      // TODO: this shouldn't need to be cast through any
      // https://github.com/DefinitelyTyped/DefinitelyTyped/pull/34898
      if ((request as any).complete) {
        response.end();
      } else {
        request.on("end", () => response.end());
        request.resume();
      }

      return;
    }

    console.warn(`No rules matched requested URL "${request.url}".`);
    response.statusCode = 404;
    response.end();
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
