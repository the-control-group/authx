import { GraphQLSchema, GraphQLObjectType, GraphQLFieldConfig } from "graphql";
import { StrategyCollection } from "../StrategyCollection";
import { Context } from "../Context";

import { mutationFields, mutationTypes } from "./mutation";
import { queryFields } from "./query";

import { GraphQLAuthority } from "./GraphQLAuthority";
import { GraphQLAuthorization } from "./GraphQLAuthorization";
import { GraphQLClient } from "./GraphQLClient";
import { GraphQLCredential } from "./GraphQLCredential";
import { GraphQLGrant } from "./GraphQLGrant";
import { GraphQLRole } from "./GraphQLRole";
import { GraphQLTimestamp } from "./GraphQLTimestamp";
import { GraphQLUser } from "./GraphQLUser";
import { GraphQLUserType } from "./GraphQLUserType";

export * from "./GraphQLAdministrationInput";
export * from "./GraphQLAuthority";
export * from "./GraphQLAuthorityConnection";
export * from "./GraphQLAuthorityEdge";
export * from "./GraphQLAuthorization";
export * from "./GraphQLAuthorizationConnection";
export * from "./GraphQLAuthorizationEdge";
export * from "./GraphQLClient";
export * from "./GraphQLClientConnection";
export * from "./GraphQLClientEdge";
export * from "./GraphQLConnection";
export * from "./GraphQLCredential";
export * from "./GraphQLCredentialConnection";
export * from "./GraphQLCredentialEdge";
export * from "./GraphQLEdge";
export * from "./GraphQLExplanation";
export * from "./GraphQLGrant";
export * from "./GraphQLGrantConnection";
export * from "./GraphQLGrantEdge";
export * from "./GraphQLNode";
export * from "./GraphQLPageInfo";
export * from "./GraphQLRole";
export * from "./GraphQLRoleConnection";
export * from "./GraphQLRoleEdge";
export * from "./GraphQLScope";
export * from "./GraphQLScopeTemplate";
export * from "./GraphQLTimestamp";
export * from "./GraphQLTokenFormat";
export * from "./GraphQLUser";
export * from "./GraphQLUserConnection";
export * from "./GraphQLUserEdge";
export * from "./GraphQLUserType";

export function createSchema(strategies: StrategyCollection): GraphQLSchema {
  const query = new GraphQLObjectType<any, Context>({
    name: "Query",
    description: "The query root of AuthX's GraphQL interface.",
    fields: () => ({
      ...(queryFields as {
        [key: string]: GraphQLFieldConfig<any, Context, any>;
      }),
      ...strategies.queryFields
    })
  });

  const mutation = new GraphQLObjectType<any, Context>({
    name: "Mutation",
    description: "The mutation root of AuthX's GraphQL interface.",
    fields: () => ({
      ...(mutationFields as {
        [key: string]: GraphQLFieldConfig<any, Context, any>;
      }),
      ...strategies.mutationFields
    })
  });

  return new GraphQLSchema({
    types: [
      GraphQLAuthority,
      GraphQLClient,
      GraphQLCredential,
      GraphQLGrant,
      GraphQLRole,
      GraphQLTimestamp,
      GraphQLAuthorization,
      GraphQLUser,
      GraphQLUserType,

      ...mutationTypes,

      // merge in types from strategies
      ...strategies.types
    ],
    mutation,
    query
  });
}
