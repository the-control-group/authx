import { Authority, Credential } from "./model/index.js";
import { GraphQLNamedType, GraphQLFieldConfig } from "graphql";
import { Context } from "./Context.js";
import Router from "koa-router";
import x from "./x.js";

export interface Strategy {
  name: string;
  types: GraphQLNamedType[];
  queryFields: { [field: string]: GraphQLFieldConfig<any, Context, any> };
  mutationFields: { [field: string]: GraphQLFieldConfig<any, Context, any> };
  authorityModel: { new (data: any): Authority<any> };
  credentialModel: { new (data: any): Credential<any> };
  router?: () => Router<any, { [x]: Context }>;
}
