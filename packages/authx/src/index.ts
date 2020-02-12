import body from "koa-body";
import v4 from "uuid/v4";
import createPlaygroundMiddleware from "graphql-playground-middleware-koa";
import Router, { IRouterOptions } from "koa-router";
import { errorHandler, execute } from "graphql-api-koa";
import { Context as KoaContext, Next as KoaNext } from "koa";
import { parse } from "auth-header";
import { Pool } from "pg";

import x from "./x";
import oauth2 from "./oauth2";
import { Config, assertConfig } from "./Config";
import { Context } from "./Context";
import { createSchema } from "./graphql";
import { fromBasic, fromBearer } from "./util/getAuthorization";
import { StrategyCollection } from "./StrategyCollection";
import { UnsupportedMediaTypeError } from "./errors";
import { createAuthXExplanations } from "./explanations";

export * from "./x";
export * from "./errors";
export * from "./model";
export * from "./graphql";
export * from "./Strategy";
export * from "./StrategyCollection";
export * from "./Config";
export * from "./Context";
export * from "./util/validateIdFormat";

// FIXME: The newest types from @types/koa fail to match perfectly valid
// overloads for chained middleware. I haven't had a chance to really dive into
// what's going on, so for now we are going to cast through any.
type AuthXMiddleware = any; // Middleware<any, KoaContext & { [x]: Context }>

export class AuthX extends Router<any, { [x]: Context }> {
  public readonly pool: Pool;
  public constructor(config: Config & IRouterOptions) {
    assertConfig(config);
    super(config);

    const explanations = createAuthXExplanations({ [config.realm]: "AuthX" });

    const strategies =
      config.strategies instanceof StrategyCollection
        ? config.strategies
        : new StrategyCollection(config.strategies);

    // create a database pool
    this.pool = new Pool(config.pg);

    // define the context middleware
    const contextMiddleware = async (
      ctx: KoaContext & { [x]: Context },
      next: KoaNext
    ): Promise<void> => {
      const tx = await this.pool.connect();
      try {
        let authorization = null;

        const auth = ctx.request.header.authorization
          ? parse(ctx.request.header.authorization)
          : null;

        // HTTP Basic Authorization
        const basic =
          auth && auth.scheme === "Basic" && typeof auth.token === "string"
            ? auth.token
            : null;

        if (basic) {
          authorization = await fromBasic(tx, basic);

          // Invoke the authorization. Because the resource validates basic
          // tokens by making a GraphQL request here, each request can be
          // considered an invocation.
          await authorization.invoke(tx, {
            id: v4(),
            format: "basic",
            createdAt: new Date()
          });
        }

        // Bearer Token Authorization
        const bearer =
          auth && auth.scheme === "Bearer" && typeof auth.token === "string"
            ? auth.token
            : null;

        if (bearer) {
          authorization = await fromBearer(tx, config.publicKeys, bearer);

          // There is no need to invoke this authorization here, since it was
          // invoked when the bearer token was generated.
        }

        // An authorization header exists, but did not match a known format.
        if (ctx.request.header.authorization && !authorization) {
          throw new Error(
            "An authorization header must be of either HTTP Basic or Bearer format."
          );
        }

        const context: Context = {
          ...ctx[x],
          ...config,
          strategies,
          authorization,
          pool: this.pool,
          explanations: explanations
        };

        ctx[x] = context;
      } finally {
        tx.release();
      }

      await next();
    };

    // GraphQL
    // =======
    // The GraphQL endpoint is the primary API for interacting with AuthX.

    this.post(
      "/graphql",

      errorHandler(),

      contextMiddleware as AuthXMiddleware,

      // The GraphQL endpoint only accepts JSON. This helps protect against CSRF
      // attacks that send urlenceded data via HTML forms.
      async (ctx, next) => {
        if (!ctx.is("json"))
          throw new UnsupportedMediaTypeError(
            "Requests to the AuthX GraphQL endpoint MUST specify a Content-Type of `application/json`."
          );

        await next();
      },

      body({ multipart: false, urlencoded: false, text: false, json: true }),

      execute({
        schema: config.processSchema
          ? config.processSchema(createSchema(strategies))
          : createSchema(strategies),
        override: (ctx: any) => {
          const contextValue: Context = ctx[x];

          return {
            contextValue
          };
        }
      })
    );

    // GraphiQL
    // ========
    // This is a graphical (get it, graph-i-QL) interface to the AuthX API.
    this.all("/graphiql", createPlaygroundMiddleware({ endpoint: "/graphql" }));

    // OAuth
    // =====
    // The core AuthX library supports the following OAuth2 grant types:
    //
    // - `authorization_code`
    // - `refresh_token`
    //
    // Because it involves presentation elements, the core AuthX library does
    // **not** implement the `code` grant type. Instead, a compatible reference
    // implementation of this flow is provided by the `authx-interface` NPM
    // package.

    this.post(
      "/",
      contextMiddleware as AuthXMiddleware,
      body({ multipart: false, urlencoded: true, text: false, json: true }),
      oauth2 as AuthXMiddleware
    );
  }
}

export default AuthX;
