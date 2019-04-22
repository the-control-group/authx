import { Pool } from "pg";
import { Middleware, ParameterizedContext } from "koa";
import Router, { IRouterOptions } from "koa-router";
import body from "koa-body";
import { errorHandler, execute } from "graphql-api-koa";
import x from "./x";

import createSchema from "./graphql";
import oauth2 from "./oauth2";
import graphiql from "./graphiql";

import { Config, assertConfig } from "./Config";
import { Context } from "./Context";
import { Token } from "./model";
import { parse } from "auth-header";
import {
  NotFoundError,
  AuthenticationError,
  UnsupportedMediaTypeError
} from "./errors";

const __DEV__ = process.env.NODE_ENV !== "production";

import { StrategyCollection } from "./StrategyCollection";

export * from "./errors";
export * from "./model";
export * from "./graphql";
export * from "./Strategy";
export * from "./StrategyCollection";
export * from "./Config";
export * from "./Context";

export class AuthX<
  StateT extends any = any,
  CustomT extends { [x]: Context } = { [x]: Context }
> extends Router<StateT, CustomT> {
  public constructor(config: Config & IRouterOptions) {
    assertConfig(config);
    super(config);

    const strategies =
      config.strategies instanceof StrategyCollection
        ? config.strategies
        : new StrategyCollection(config.strategies);

    // create a database pool
    const pool = new Pool(config.pg);

    // define the context middleware
    const context: Middleware<ParameterizedContext<any, any>> = async (
      ctx,
      next
    ): Promise<void> => {
      const tx = await pool.connect();
      try {
        let token = null;

        const auth = ctx.request.header.authorization
          ? parse(ctx.request.header.authorization)
          : null;

        const basic =
          auth && auth.scheme === "Basic" && typeof auth.token === "string"
            ? auth.token
            : null;

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
          ...config,
          strategies,
          token,
          tx
        };

        ctx[x] = context;

        await next();
      } finally {
        tx.release();
      }
    };

    // GraphQL
    // =======
    // The GraphQL endpoint is the primary API for interacting with AuthX.

    this.post(
      "/graphql",

      errorHandler(),

      context,

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
        schema: createSchema(strategies),
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
    this.get("/graphiql", async (ctx, next) => {
      ctx.body = graphiql;
      await next();
    });

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
      body({ multipart: false, urlencoded: true, text: false, json: true }),
      oauth2
    );
  }
}

export default AuthX;
