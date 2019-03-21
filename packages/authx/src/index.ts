import { Pool } from "pg";
import { Middleware, ParameterizedContext } from "koa";
import Router from "koa-router";
import body from "koa-body";
import { errorHandler, execute } from "graphql-api-koa";
import x from "./x";

import createSchema from "./graphql";
export * from "./graphql";

import { Context } from "./graphql/Context";
import { Strategy } from "./Strategy";
import { Token, Authority, Credential } from "./model";
import { parse } from "auth-header";
import { NotFoundError, AuthenticationError } from "./errors";

const __DEV__ = process.env.NODE_ENV !== "production";

export class AuthX<StateT = any, CustomT = {}> extends Router<StateT, CustomT> {
  private pool: Pool;
  public readonly realm: string;
  public readonly strategies: Strategy[];

  public constructor(config: any, strategies: Strategy[]) {
    super(config);

    // create a database pool
    this.pool = new Pool();

    this.realm = config.realm || "AuthX";
    this.strategies = strategies;

    // define the context middleware
    const context: Middleware<ParameterizedContext<any, any>> = async (
      ctx,
      next
    ): Promise<void> => {
      const tx = await this.pool.connect();
      try {
        let token = null;

        const auth = ctx.request.header.authorization
          ? parse(ctx.request.header.authorization)
          : null;

        const basic =
          auth && auth.scheme === "Basic" && typeof auth.token === "string"
            ? auth.token
            : ctx.cookies.get("session", { signed: false });

        if (basic) {
          const [id, secret] = new Buffer(basic, "base64")
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

          if (!token.enabled)
            throw new AuthenticationError(
              __DEV__
                ? "The token specified in HTTP authorization header is disabled."
                : undefined
            );

          if (token.secret !== secret)
            throw new AuthenticationError(
              __DEV__
                ? "The secret specified in HTTP authorization header was incorrect."
                : undefined
            );

          const grant = await token.user(tx);
          if (grant && !grant.enabled)
            throw new AuthenticationError(
              __DEV__
                ? "The grant of the token specified in HTTP authorization header is disabled."
                : undefined
            );

          if (!(await token.user(tx)).enabled)
            throw new AuthenticationError(
              __DEV__
                ? "The user of the token specified in HTTP authorization header is disabled."
                : undefined
            );
        }

        const context: Context = {
          realm: this.realm,
          tx,
          token,
          authorityMap,
          credentialMap
        };

        ctx[x] = context;

        await next();
      } finally {
        tx.release();
      }
    };

    // OAuth
    // =====
    // These endpoints are used by clients wishing to authenticate a user with
    // AuthX. They implement the OAuth 2.0 flow for "authorization code" grant
    // types.

    // this.get('/oauth2', oauth2Controller);
    // this.post('/oauth2', oauth2Controller);

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
          const contextValue: Context = ctx[x];

          return {
            contextValue
          };
        }
      })
    );
  }
}

export default AuthX;
