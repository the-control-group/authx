import Koa, { Middleware } from "koa";
import Router, { IRouterParamContext } from "koa-router";
import body from "koa-body";
import { errorHandler, execute } from "graphql-api-koa";
import { Pool } from "pg";

import { schema } from "./graphql";

class AuthX<StateT = any, CustomT = {}> extends Router<StateT, CustomT> {
  // private middleware: () => Middleware<StateT, IRouterParamContext<StateT, CustomT>>;

  constructor(config: any, strategies: any) {
    super(config);

    // // set the config
    // this.config = config;

    // // create a database pool
    // this.pool = new Pool(
    //   config.db,
    //   config.db.pool.max,
    //   config.db.pool.min,
    //   config.db.pool.timeout
    // );

    // // attach the strategies
    // this.strategies = strategies;

    // // Middleware
    // // ----------

    // // add authx namespace context
    // this.use((ctx, next) => {
    //   ctx[x] = { authx: this };
    //   return next();
    // });

    // // error handling
    // this.use(errorMiddleware);

    // // get a database connection
    // this.use(dbMiddleware);

    // // add CORS header if necessary
    // this.use(corsMiddleware);

    // // get the current bearer token
    // this.use(bearerMiddleware);

    // // get the current user
    // this.use(userMiddleware);

    // OAuth
    // =====
    // These endpoints are used by clients wishing to authenticate a user with
    // AuthX. They implement the OAuth 2.0 flow for "authorization code" grant
    // types.

    // this.get('/oauth', oauthController);
    // this.post('/oauth', oauthController);

    // Keys
    // ====
    // This outputs valid public keys and algorithms that can be used to verify
    // access tokens by resource servers. The first key is always the most
    // recent.

    // this.get('/keys', async ctx => {
    //   ctx.body = this.config.accessToken.public;
    // });

    // GraphQL
    // =======
    // The management interface is in GraphQL.
    this.post(
      "/graphql",

      errorHandler(),

      body(),

      execute({
        schema,
        override: (ctx: any) => {
          return {
            contextValue: {}
          };
        }
      })
    );
  }
}
