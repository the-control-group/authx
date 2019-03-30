import {
  GraphQLSchema,
  GraphQLNamedType,
  GraphQLObjectType,
  GraphQLFieldConfig
} from "graphql";
import { StrategyCollection } from "../StrategyCollection";
import { Context } from "../Context";

import { mutationFields, mutationTypes } from "./mutation";
import { queryFields } from "./query";

import { GraphQLAuthority } from "./GraphQLAuthority";
import { GraphQLClient } from "./GraphQLClient";
import { GraphQLCredential } from "./GraphQLCredential";
import { GraphQLGrant } from "./GraphQLGrant";
import { GraphQLRole } from "./GraphQLRole";
import { GraphQLTimestamp } from "./GraphQLTimestamp";
import { GraphQLToken } from "./GraphQLToken";
import { GraphQLUser } from "./GraphQLUser";
import { GraphQLUserType } from "./GraphQLUserType";
import {
  GraphQLContactName,
  GraphQLContactAddress,
  GraphQLContactOrganization,
  GraphQLContactAccount,
  GraphQLContactEmail,
  GraphQLContactUrl,
  GraphQLContactPhoneNumber,
  GraphQLContactIm,
  GraphQLContactPhoto,
  GraphQLContactTag,
  GraphQLContactRelationship,
  GraphQLContact
} from "./GraphQLContact";

export * from "./GraphQLAuthority";
export * from "./GraphQLCredential";
export * from "./GraphQLAuthority";
export * from "./GraphQLClient";
export * from "./GraphQLCredential";
export * from "./GraphQLGrant";
export * from "./GraphQLRole";
export * from "./GraphQLTimestamp";
export * from "./GraphQLToken";
export * from "./GraphQLUser";
export * from "./GraphQLUserType";
export * from "./GraphQLContact";
export * from "./GraphQLContactInput";

export default function createSchema(
  strategies: StrategyCollection
): GraphQLSchema {
  const query = new GraphQLObjectType<any, Context>({
    name: "Query",
    description: "The query root of AuthX's GraphQL interface.",
    fields: () => ({
      ...queryFields,
      ...strategies.queryFields
    })
  });

  const mutation = new GraphQLObjectType<any, Context>({
    name: "Mutation",
    description: "The mutation root of AuthX's GraphQL interface.",
    fields: () => ({
      ...mutationFields,
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
      GraphQLToken,
      GraphQLUser,
      GraphQLUserType,
      GraphQLContactName,
      GraphQLContactAddress,
      GraphQLContactOrganization,
      GraphQLContactAccount,
      GraphQLContactEmail,
      GraphQLContactUrl,
      GraphQLContactPhoneNumber,
      GraphQLContactIm,
      GraphQLContactPhoto,
      GraphQLContactTag,
      GraphQLContactRelationship,
      GraphQLContact,

      ...mutationTypes,

      // merge in types from strategies
      ...strategies.types
    ],
    mutation,
    query
  });
}
