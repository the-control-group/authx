import { Pool, PoolClient } from "pg";
import { Middleware, ParameterizedContext } from "koa";
import Router from "koa-router";
import body from "koa-body";
import { errorHandler, execute } from "graphql-api-koa";
import x from "./x";

import createSchema from "./graphql";
export * from "./graphql";

import { Context } from "./graphql/Context";
import { Strategy } from "./Strategy";
import { Token, Authority, Credential } from "./models";
import { parse } from "auth-header";
import { NotFoundError, AuthenticationError } from "./errors";

const __DEV__ = process.env.NODE_ENV !== "production";

export class AuthX<StateT = any, CustomT = {}> extends Router<StateT, CustomT> {
  private pool: Pool;
  public readonly realm: string;

  public constructor(config: any, strategies: Strategy[]) {
    super(config);
    this.realm = config.realm || "AuthX";

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
    const context: Middleware<ParameterizedContext<any, any>> = async (
      ctx,
      next
    ) => {
      const tx = await this.pool.connect();
      try {
        let token = null;

        const auth = ctx.request.header.authorization
          ? parse(ctx.request.header.authorization)
          : null;

        if (auth && auth.scheme === "Basic" && typeof auth.token === "string") {
          const [id, secret] = new Buffer(auth.token, "base64")
            .toString()
            .split(":", 2);

          try {
            token = await Token.read(tx, id);
          } catch (error) {
            if (!(error instanceof NotFoundError)) throw error;
            throw new AuthenticationError(
              __DEV__
                ? "Unable to find the token specified in the HTTP authorization header."
                : undefined
            );
          }

          if (token.secret !== secret)
            throw new AuthenticationError(
              __DEV__
                ? "The secret specified in HTTP authorization header was incorrect."
                : undefined
            );
        }

        ctx[x] = {
          authx: this,
          tx,
          token
        };

        await next();
      } finally {
        tx.release();
      }
    };

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

    const authorityMap = strategies.reduce(
      (
        map: {
          [field: string]: { new (data: any): Authority<any> };
        },
        s: Strategy
      ) => {
        if (map[s.name])
          throw new Error(
            `INVARIANT: Multiple strategies cannot use the same identifier; "${
              s.name
            }" is used twice.`
          );

        map[s.name] = s.authorityModel;
        return map;
      },
      {}
    );

    const credentialMap = strategies.reduce(
      (
        map: {
          [field: string]: { new (data: any): Credential<any> };
        },
        s: Strategy
      ) => {
        if (map[s.name])
          throw new Error(
            `INVARIANT: Multiple strategies cannot use the same identifier; "${
              s.name
            }" is used twice.`
          );

        map[s.name] = s.credentialModel;
        return map;
      },
      {}
    );

    this.post(
      "/graphql",

      errorHandler(),

      context,

      body(),

      execute({
        schema: createSchema(strategies),
        override: (ctx: any) => {
          const contextValue: Context = {
            realm: this.realm,
            tx: ctx[x].tx,
            token: ctx[x].token,
            authorityMap,
            credentialMap
          };

          return {
            contextValue
          };
        }
      })
    );
  }
}

export default AuthX;
