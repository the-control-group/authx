import AbortController from "abort-controller";
import EventEmitter from "events";
import fetch from "node-fetch";
import { IncomingMessage, ServerResponse } from "http";
import { createProxyServer } from "http-proxy";

import { authorize, AuthorizeRule } from "./behavior/authorize";
import { passthrough, PassthroughRule } from "./behavior/passthrough";
import { restrict, RestrictRule } from "./behavior/restrict";

export type Test = string | RegExp | ((url: string) => boolean);

interface Config {
  readonly proxyHost: string;
  readonly proxyPort: number;

  readonly authxUrl: string;
  readonly authxPublicKeyCacheRefreshInterval: number;

  readonly rules: (PassthroughRule | RestrictRule | AuthorizeRule)[];
}

export class AuthXProxy extends EventEmitter {
  public readonly config: Config;
  public readonly httpProxy: ReturnType<typeof createProxyServer>;
  private _keys: null | ReadonlyArray<string> = null;
  private _fetchTimeout: null | ReturnType<typeof setTimeout> = null;
  private _fetchAbortController: null | AbortController = null;

  public constructor(config: Config) {
    super();
    this.config = config;
    this.httpProxy = createProxyServer({});
    this._fetchKeys();
  }

  private _fetchKeys = async (): Promise<void> => {
    this._fetchTimeout = null;
    this._fetchAbortController = new AbortController();

    try {
      // Fetch the keys from AuthX.
      const keys: string[] = (await (await fetch(
        this.config.authxUrl + "/graphql",
        {
          signal: this._fetchAbortController.signal,
          method: "POST",
          body: "query { keys }"
        }
      )).json()).query.keys;

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

      // Fetch again in 5 minutes.
      this._fetchTimeout = setTimeout(this._fetchKeys, 300000);
    } catch (error) {
      this.emit("error", error);

      // Fetch again in 30 seconds.
      this._fetchTimeout = setTimeout(this._fetchKeys, 30000);
    } finally {
      this._fetchAbortController = null;
    }
  };

  private async _callback(
    request: IncomingMessage,
    response: ServerResponse
  ): Promise<void> {
    const keys = this._keys;
    if (!keys) {
      response.statusCode = 503;

      // TODO: this shouldn't need to be cast through any
      // https://github.com/DefinitelyTyped/DefinitelyTyped/pull/34898
      if ((request as any).complete) {
        response.end();
      } else {
        request.on("finish", () => response.end());
        request.resume();
      }

      return;
    }

    const url = request.url;
    if (url) {
      // Proxy
      for (const rule of this.config.rules) {
        if (
          (typeof rule.test === "function" && rule.test(url)) ||
          (typeof rule.test === "string" && new RegExp(rule.test).test(url)) ||
          (rule.test instanceof RegExp && rule.test.test(url))
        ) {
          // PASSTHROUGH
          if (rule.behavior === "passthrough") {
            return passthrough(this, keys, rule, request, response);
          }

          // RESTRICT
          if (rule.behavior === "restrict") {
            return restrict(this, keys, rule, request, response);
          }
        }
      }
    }

    console.warn(`No rules matched requested URL "${request.url}".`);
    response.statusCode = 404;
    response.end();
  }

  public async listen(): Promise<void> {}

  public async close(): Promise<void> {}
}
