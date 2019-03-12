import { GraphQLSchema, GraphQLNamedType } from "graphql";

import GraphQLMutation from "./GraphQLMutation";
import GraphQLQuery from "./GraphQLQuery";

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

import { GraphQLProfileInput } from "./GraphQLProfileInput";

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
export * from "./GraphQLProfile";
export * from "./GraphQLProfileInput";

export default (types: GraphQLNamedType[]) =>
  new GraphQLSchema({
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
      GraphQLProfile,

      ...types
    ],
    mutation: GraphQLMutation,
    query: GraphQLQuery
  });
