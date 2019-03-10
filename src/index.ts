import { Middleware } from "koa";
import { Pool } from "pg";
import Router from "koa-router";
import body from "koa-body";
import { errorHandler, execute } from "graphql-api-koa";
import x from "./x";

import schema from "./graphql";
export * from "./graphql";

export class AuthX<StateT = any, CustomT = {}> extends Router<StateT, CustomT> {
  private pool: Pool;

  constructor(config: any, strategies: any) {
    super(config);

    // // set the config
    // this.config = config;

    // create a database pool
    this.pool = new Pool();

    // // attach the strategies
    // this.strategies = strategies;

    // Middleware
    // ----------

    // // error handling
    // this.use(errorMiddleware);

    // // add CORS header if necessary
    // this.use(corsMiddleware);

    // add authx namespace context
    this.use(async (ctx: any, next) => {
      const tx = await this.pool.connect();

      ctx[x] = {
        authx: this,
        tx
      };

      try {
        await next();
      } finally {
        tx.release();
      }
    });

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
            contextValue: {
              tx: ctx[x].tx
            }
          };
        }
      })
    );
  }
}

export default AuthX;
