import { Authority, Credential } from "./model";
import { GraphQLNamedType, GraphQLFieldConfig } from "graphql";
import { Context } from "./graphql/Context";

export interface Strategy {
  name: string;
  types: GraphQLNamedType[];
  queryFields: { [field: string]: GraphQLFieldConfig<any, any, Context> };
  mutationFields: { [field: string]: GraphQLFieldConfig<any, any, Context> };
  authorityModel: { new (data: any): Authority<any> };
  credentialModel: { new (data: any): Credential<any> };
}
