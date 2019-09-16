import {
  validateAuthorizationHeader,
  NotAuthorizedError
} from "@authx/http-proxy-resource";

import x from "./x";
import { isSuperset } from "@authx/scopes";
import { Middleware, ParameterizedContext } from "koa";

// Add middleware to check authorization header.
export async function authorize(ctx, next): Promise<void> {
  const keys = ctx[x].keys;
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
      ctx[x].authxUrl,
      keys,
      authorizationHeader
    );

    if (!isSuperset(authorizationScopes, [`${ctx[x].realm}:**:**`])) {
      ctx.response.status = 403;
      ctx.response.body = {
        schema: "urn:ietf:params:scim:api:messages:2.0:Error",
        status: 403,
        scimType: undefined,
        detail: `The scope ${ctx[x].realm}:**:** is required to use the SCIM AuthX API.`
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

  await next();
}
