import {
  GraphQLObjectType,
  GraphQLSchema,
  isNamedType,
  GraphQLNamedType,
  GraphQLFieldConfig
} from "graphql";

import { PoolClient } from "pg";

import { GraphQLAuthority } from "./GraphQLAuthority";
import { GraphQLClient } from "./GraphQLClient";
import { GraphQLCredential } from "./GraphQLCredential";
import { GraphQLGrant } from "./GraphQLGrant";
import { GraphQLRole } from "./GraphQLRole";
import { GraphQLTimestamp } from "./GraphQLTimestamp";
import { GraphQLUser } from "./GraphQLUser";

export const schema = new GraphQLSchema({
  types: [
    GraphQLAuthority,
    GraphQLClient,
    GraphQLCredential,
    GraphQLGrant,
    GraphQLRole,
    GraphQLTimestamp,
    GraphQLUser
  ],

  // mutation: new GraphQLObjectType({
  //   name: "Mutation",
  //   description: "The mutation root of boltline's GraphQL interface.",
  //   fields: () => mutationFields
  // }),

  query: new GraphQLObjectType({
    name: "Query",
    description: "The query root of boltline's GraphQL interface.",
    fields: () => {
      return {};
    }
  })
});
