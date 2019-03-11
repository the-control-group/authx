import {
  GraphQLFieldConfig,
  GraphQLID,
  GraphQLNamedType,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLResolveInfo,
  GraphQLSchema,
  isNamedType,
  GraphQLObjectTypeConfig,
  GraphQLFieldResolver
} from "graphql";

import { PoolClient } from "pg";

import { GraphQLAuthority } from "./GraphQLAuthority";
import { GraphQLClient } from "./GraphQLClient";
import { GraphQLCredential } from "./GraphQLCredential";
import { GraphQLGrant } from "./GraphQLGrant";
import { GraphQLRole } from "./GraphQLRole";
import { GraphQLTimestamp } from "./GraphQLTimestamp";
import { GraphQLUser } from "./GraphQLUser";
import {
  GraphQLProfileName,
  GraphQLProfileAddress,
  GraphQLProfileOrganization,
  GraphQLProfileAccount,
  GraphQLProfileEmail,
  GraphQLProfileUrl,
  GraphQLProfilePhoneNumber,
  GraphQLProfileIm,
  GraphQLProfilePhoto,
  GraphQLProfileTag,
  GraphQLProfileRelationship,
  GraphQLProfile
} from "./GraphQLProfile";

import { User } from "../models";

export * from "./GraphQLAuthority";
export * from "./GraphQLClient";
export * from "./GraphQLCredential";
export * from "./GraphQLGrant";
export * from "./GraphQLRole";
export * from "./GraphQLTimestamp";
export * from "./GraphQLUser";
export * from "./GraphQLProfile";

export default new GraphQLSchema({
  types: [
    GraphQLAuthority,
    GraphQLClient,
    GraphQLCredential,
    GraphQLGrant,
    GraphQLRole,
    GraphQLTimestamp,
    GraphQLUser,
    GraphQLProfileName,
    GraphQLProfileAddress,
    GraphQLProfileOrganization,
    GraphQLProfileAccount,
    GraphQLProfileEmail,
    GraphQLProfileUrl,
    GraphQLProfilePhoneNumber,
    GraphQLProfileIm,
    GraphQLProfilePhoto,
    GraphQLProfileTag,
    GraphQLProfileRelationship,
    GraphQLProfile
  ],

  // mutation: new GraphQLObjectType({
  //   name: "Mutation",
  //   description: "The mutation root of AuthX's GraphQL interface.",
  //   fields: () => mutationFields
  // }),

  query: new GraphQLObjectType<any, any, any>({
    name: "Query",
    description: "The query root of AuthX's GraphQL interface.",
    fields: () => {
      return {
        user: {
          type: GraphQLUser,
          description: "Fetch a user by ID.",
          args: {
            id: {
              type: new GraphQLNonNull(GraphQLID)
            }
          },
          async resolve(
            source,
            args: { id: string },
            context: { tx: PoolClient; session: any },
            info
          ) {
            return User.read(context.tx, args.id);
          }
        }
      };
    }
  })
});
