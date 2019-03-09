declare module "graphql-api-koa" {
  import { GraphQLSchema } from "graphql";
  import { Middleware, ParameterizedContext } from "koa";

  interface ExecuteOptions {
    schema?: GraphQLSchema;
    rootValue?: any;
    contextValue?: any;
    fieldResolver?: any;
  }

  export const errorHandler: <StateT = any, CustomT = {}>() => Middleware<
    StateT,
    CustomT
  >;

  export const execute: <StateT = any, CustomT = {}>(
    options: ExecuteOptions & {
      override?: (ctx: ParameterizedContext<StateT, CustomT>) => ExecuteOptions;
    }
  ) => Middleware<StateT, CustomT>;
}
