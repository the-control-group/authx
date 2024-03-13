import { GraphQLSchema, GraphQLObjectType, GraphQLFieldConfig } from "graphql";
import { StrategyCollection } from "../StrategyCollection.js";
import { Context } from "../Context.js";

import { mutationFields, mutationTypes } from "./mutation/index.js";
import { queryFields } from "./query/index.js";

import { GraphQLAuthority } from "./GraphQLAuthority.js";
import { GraphQLAuthorization } from "./GraphQLAuthorization.js";
import { GraphQLClient } from "./GraphQLClient.js";
import { GraphQLCredential } from "./GraphQLCredential.js";
import { GraphQLGrant } from "./GraphQLGrant.js";
import { GraphQLRole } from "./GraphQLRole.js";
import { GraphQLTimestamp } from "./GraphQLTimestamp.js";
import { GraphQLUser } from "./GraphQLUser.js";
import { GraphQLUserType } from "./GraphQLUserType.js";

export * from "./GraphQLAdministrationInput.js";
export * from "./GraphQLAuthority.js";
export * from "./GraphQLAuthorityConnection.js";
export * from "./GraphQLAuthorityEdge.js";
export * from "./GraphQLAuthorization.js";
export * from "./GraphQLAuthorizationConnection.js";
export * from "./GraphQLAuthorizationEdge.js";
export * from "./GraphQLClient.js";
export * from "./GraphQLClientConnection.js";
export * from "./GraphQLClientEdge.js";
export * from "./GraphQLConnection.js";
export * from "./GraphQLCredential.js";
export * from "./GraphQLCredentialConnection.js";
export * from "./GraphQLCredentialEdge.js";
export * from "./GraphQLEdge.js";
export * from "./GraphQLExplanation.js";
export * from "./GraphQLGrant.js";
export * from "./GraphQLGrantConnection.js";
export * from "./GraphQLGrantEdge.js";
export * from "./GraphQLNode.js";
export * from "./GraphQLPageInfo.js";
export * from "./GraphQLRole.js";
export * from "./GraphQLRoleConnection.js";
export * from "./GraphQLRoleEdge.js";
export * from "./GraphQLScope.js";
export * from "./GraphQLScopeTemplate.js";
export * from "./GraphQLTimestamp.js";
export * from "./GraphQLTokenFormat.js";
export * from "./GraphQLUser.js";
export * from "./GraphQLUserConnection.js";
export * from "./GraphQLUserEdge.js";
export * from "./GraphQLUserType.js";

export function createSchema(strategies: StrategyCollection): GraphQLSchema {
  const query = new GraphQLObjectType<any, Context>({
    name: "Query",
    description: "The query root of AuthX's GraphQL interface.",
    fields: () => ({
      ...(queryFields as {
        [key: string]: GraphQLFieldConfig<any, Context, any>;
      }),
      ...strategies.queryFields,
    }),
  });

  const mutation = new GraphQLObjectType<any, Context>({
    name: "Mutation",
    description: "The mutation root of AuthX's GraphQL interface.",
    fields: () => ({
      ...(mutationFields as {
        [key: string]: GraphQLFieldConfig<any, Context, any>;
      }),
      ...strategies.mutationFields,
    }),
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
      ...strategies.types,
    ],
    mutation,
    query,
  });
}
