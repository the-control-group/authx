import { GraphQLSchema } from "graphql";

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
import { GraphQLProfileInput } from "./GraphQLProfileInput";

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

import { Strategy } from "../Strategy";

export * from "./GraphQLAuthority";
export * from "./GraphQLCredential";

export default () =>
  new GraphQLSchema({
    // TODO: add schema types
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
    mutation: GraphQLMutation,
    query: GraphQLQuery
  });
