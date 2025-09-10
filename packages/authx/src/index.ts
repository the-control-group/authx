import body from "koa-body";
import { v4 } from "uuid";
import Router, { RouterOptions } from "@koa/router";
import errorHandler from "graphql-api-koa/errorHandler.mjs";
import execute from "graphql-api-koa/execute.mjs";
import { Context as KoaContext, Next as KoaNext, Middleware } from "koa";
import { parse } from "auth-header";
import pg, { Pool } from "pg";

import x from "./x.js";
import oauth2 from "./oauth2.js";
import { Config, assertConfig } from "./Config.js";
import { Context } from "./Context.js";
import { createSchema } from "./graphql/index.js";
import { fromBasic, fromBearer } from "./util/getAuthorization.js";
import { StrategyCollection } from "./StrategyCollection.js";
import { UnsupportedMediaTypeError } from "./errors.js";
import { createAuthXExplanations } from "./explanations.js";
import { DataLoaderExecutor } from "./loader.js";
import {
  LocalMemoryRateLimiter,
  NoOpRateLimiter,
  RateLimiter,
} from "./util/ratelimiter.js";
import {
  EagerInvocationRecorder,
  InvocationRecorder,
} from "./InvocationRecorder.js";

export * from "./x.js";
export * from "./errors.js";
export * from "./loader.js";
export * from "./model/index.js";
export * from "./graphql/index.js";
export * from "./Strategy.js";
export * from "./StrategyCollection.js";
export * from "./Config.js";
export * from "./Context.js";
export * from "./util/validateIdFormat.js";

type AuthXMiddleware = Middleware<any, KoaContext & { [x]: Context }>;

export class AuthX extends Router<any, { [x]: Context }> {
  public readonly pool: Pool;
  public readonly rateLimiter: RateLimiter;
  public readonly invocationRecorder: InvocationRecorder;
  public constructor(config: Config & RouterOptions) {
    assertConfig(config);
    super(config);

    this.invocationRecorder =
      config.invocationRecorder ?? new EagerInvocationRecorder();

    const explanations = createAuthXExplanations({ [config.realm]: "AuthX" });

    const strategies =
      config.strategies instanceof StrategyCollection
        ? config.strategies
        : new StrategyCollection(config.strategies);

    // create a database pool
    this.pool = new pg.Pool(config.pg) as Pool;
    this.rateLimiter =
      typeof config.maxRequestsPerMinute === "number"
        ? new LocalMemoryRateLimiter(config.maxRequestsPerMinute)
        : new NoOpRateLimiter();

    // define the context middleware
    const contextMiddleware = async (
      ctx: KoaContext & { [x]: Context },
      next: KoaNext,
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

          this.rateLimiter.limit(authorization.id);

          // Invoke the authorization. Because the resource validates basic
          // tokens by making a GraphQL request here, each request can be
          // considered an invocation.

          this.invocationRecorder.queueAuthorizationInvocation(
            tx,
            authorization,
            {
              id: v4(),
              format: "basic",
              createdAt: new Date(),
            },
          );
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
            "An authorization header must be of either HTTP Basic or Bearer format.",
          );
        }

        const context: Context = {
          ...ctx[x],
          ...config,
          authorization,
          explanations: explanations,
          executor: new DataLoaderExecutor(this.pool, strategies),
          rateLimiter: this.rateLimiter,
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
            "Requests to the AuthX GraphQL endpoint MUST specify a Content-Type of `application/json`.",
          );

        await next();
      },

      body.default({
        multipart: false,
        urlencoded: false,
        text: false,
        json: true,
      }),

      execute({
        schema: config.processSchema
          ? config.processSchema(createSchema(strategies))
          : (createSchema(strategies) as any),
        override: (ctx: any) => {
          const contextValue: Context = ctx[x];

          return {
            contextValue,
          };
        },
      }),
    );

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
      body.default({
        multipart: false,
        urlencoded: true,
        text: false,
        json: true,
      }) as Middleware<any, any>,
      oauth2 as AuthXMiddleware,
    );

    for (const strategyName in strategies.map) {
      const strategy = strategies.map[strategyName];
      const strategyRouterFactory = strategy.router;
      if (strategyRouterFactory) {
        const strategyRouter = strategyRouterFactory();
        this.use(
          `/strategy/${strategyName}`,
          contextMiddleware,
          strategyRouter.routes(),
          strategyRouter.allowedMethods(),
        );
      }
    }
  }
}

export default AuthX;
