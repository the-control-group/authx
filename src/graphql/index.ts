import {
  GraphQLSchema,
  GraphQLNamedType,
  GraphQLObjectType,
  GraphQLFieldConfig
} from "graphql";
import { Strategy } from "../Strategy";
import { Context } from "./Context";

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

export default (strategies: Strategy[]) => {
  const query = new GraphQLObjectType<any, Context>({
    name: "Query",
    description: "The query root of AuthX's GraphQL interface.",
    fields: () =>
      strategies.reduce(
        (
          fields: { [field: string]: GraphQLFieldConfig<any, any, Context> },
          s: Strategy
        ) => {
          for (const f of Object.keys(s.queryFields)) {
            if (fields[f]) {
              throw new Error(
                `INVARIANT: Multiple strategies cannot use the query field; "${f}" is used twice.`
              );
            }
          }

          return {
            ...fields,
            ...s.queryFields
          };
        },
        { ...queryFields }
      )
  });

  const mutation = new GraphQLObjectType<any, Context>({
    name: "Mutation",
    description: "The mutation root of AuthX's GraphQL interface.",
    fields: () =>
      strategies.reduce(
        (
          fields: { [field: string]: GraphQLFieldConfig<any, any, Context> },
          s: Strategy
        ) => {
          for (const f of Object.keys(s.mutationFields)) {
            if (fields[f]) {
              throw new Error(
                `INVARIANT: Multiple strategies cannot use the mutation field; "${f}" is used twice.`
              );
            }
          }

          return {
            ...fields,
            ...s.mutationFields
          };
        },
        { ...mutationFields }
      )
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
      ...strategies.reduce((types: GraphQLNamedType[], s: Strategy) => {
        return [...types, ...s.types];
      }, [])
    ],
    mutation,
    query
  });
};
