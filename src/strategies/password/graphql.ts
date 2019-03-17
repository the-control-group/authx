import { PoolClient } from "pg";
import bcrypt from "bcrypt";
import {
  GraphQLID,
  GraphQLInt,
  GraphQLNonNull,
  GraphQLString,
  GraphQLObjectType,
  GraphQLInputObjectType
} from "graphql";

import { PasswordAuthority, PasswordCredential } from "./models";
import {
  GraphQLAuthority,
  GraphQLCredential,
  GraphQLUser,
  GraphQLProfile
} from "../../graphql";

// Authority
// ---------

export const GraphQLPasswordAuthorityDetails = new GraphQLObjectType({
  name: "PasswordAuthorityDetails",
  fields: () => ({
    rounds: { type: GraphQLInt }
  })
});

export const GraphQLPasswordAuthority = new GraphQLObjectType({
  name: "PasswordAuthority",
  interfaces: () => [GraphQLAuthority],
  isTypeOf: (value: any): boolean => value instanceof PasswordAuthority,
  fields: () => ({
    id: { type: new GraphQLNonNull(GraphQLID) },
    strategy: { type: GraphQLString },
    name: { type: GraphQLString },
    details: { type: GraphQLPasswordAuthorityDetails }
  })
});

// Credential
// ----------

export const GraphQLPasswordCredentialDetails = new GraphQLObjectType({
  name: "PasswordCredentialDetails",
  fields: () => ({
    hash: { type: GraphQLString }
  })
});

export const GraphQLPasswordCredential = new GraphQLObjectType({
  name: "PasswordCredential",
  interfaces: () => [GraphQLCredential],
  isTypeOf: (value: any): boolean => value instanceof PasswordCredential,
  fields: () => ({
    id: { type: new GraphQLNonNull(GraphQLID) },
    user: { type: GraphQLUser },
    authority: { type: GraphQLAuthority },
    authorityUserId: { type: GraphQLString },
    details: { type: GraphQLPasswordCredentialDetails },
    profile: { type: GraphQLProfile }
  })
});
