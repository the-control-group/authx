import body from "koa-body";
import Router, { IRouterOptions } from "koa-router";
import { Middleware, ParameterizedContext } from "koa";

import x from "./x";
import { Config, assertConfig } from "./Config";
import {
  AuthXKeyCache,
  validateAuthorizationHeader,
  NotAuthorizedError
} from "@authx/http-proxy-resource";
import { isSuperset } from "@authx/scopes";

interface Context extends Config {
  authorizationHeader: string;
}

export class ScimServer<
  StateT extends any = any,
  CustomT extends { [x]: Context } = { [x]: Context }
> extends Router<StateT, CustomT> {
  private _cache: AuthXKeyCache;

  public constructor(config: Config & IRouterOptions) {
    assertConfig(config);
    super(config);
    this._cache = new AuthXKeyCache(config);

    // define the context middleware
    this.use((async (ctx, next): Promise<void> => {
      const keys = this._cache.keys;
      if (!keys) {
        ctx.response.status = 503;
        ctx.response.body = {
          schema: "urn:ietf:params:scim:api:messages:2.0:Error",
          status: 503,
          scimType: undefined,
          detail: "Service not yet available; loading AuthX keys."
        };

        return;
      }

      const authorizationHeader = ctx.request.header("authorization");
      if (!authorizationHeader) {
        ctx.response.status = 401;
        ctx.response.body = {
          schema: "urn:ietf:params:scim:api:messages:2.0:Error",
          status: 401,
          scimType: undefined,
          detail: "No authorization header was provided."
        };

        return;
      }

      try {
        const { authorizationScopes } = await validateAuthorizationHeader(
          config.authxUrl,
          keys,
          authorizationHeader
        );

        if (!isSuperset(authorizationScopes, [`${config.realm}:**:**`])) {
          ctx.response.status = 403;
          ctx.response.body = {
            schema: "urn:ietf:params:scim:api:messages:2.0:Error",
            status: 403,
            scimType: undefined,
            detail: `The scope ${config.realm}:**:** is required to use the SCIM AuthX API.`
          };

          return;
        }
      } catch (error) {
        if (!(error instanceof NotAuthorizedError)) {
          throw error;
        }

        ctx.response.status = 401;
        ctx.response.body = {
          schema: "urn:ietf:params:scim:api:messages:2.0:Error",
          status: 401,
          scimType: undefined,
          detail: error.message
        };

        return;
      }

      ctx[x] = {
        ...config,
        authorizationHeader
      } as Context;

      await next();
    }) as Middleware<ParameterizedContext<any, any>>);
  }
}

export default ScimServer;
