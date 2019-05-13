import {
  GraphQLID,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLBoolean,
  GraphQLList,
  GraphQLString
} from "graphql";

import { GraphQLAuthority, Context } from "@authx/authx";
import { OpenIdAuthority } from "../model";

// Authority
// ---------

export const GraphQLOpenIdAuthority = new GraphQLObjectType<
  OpenIdAuthority,
  Context
>({
  name: "OpenIdAuthority",
  interfaces: () => [GraphQLAuthority],
  isTypeOf: (value: any): boolean => value instanceof OpenIdAuthority,
  fields: () => ({
    id: { type: new GraphQLNonNull(GraphQLID) },
    enabled: {
      type: new GraphQLNonNull(GraphQLBoolean)
    },
    name: { type: GraphQLString },
    authUrl: {
      type: new GraphQLNonNull(GraphQLString),
      description: "The URL to which a user is directed to authenticate.",
      resolve(authority): string {
        return authority.details.authUrl;
      }
    },
    tokenUrl: {
      type: GraphQLString,
      description:
        "The URL used by AuthX to exchange an authorization code for an access token.",
      async resolve(
        authority,
        args,
        { realm, authorization: a, tx }: Context
      ): Promise<null | string> {
        return a && (await authority.isAccessibleBy(realm, a, tx, "read.*"))
          ? authority.details.tokenUrl
          : null;
      }
    },
    clientId: {
      type: new GraphQLNonNull(GraphQLString),
      description: "The client ID of AuthX in with OpenID provider.",
      resolve(authority): string {
        return authority.details.clientId;
      }
    },
    clientSecret: {
      type: GraphQLString,
      description: "The AuthX client secret for OpenId.",
      async resolve(
        authority,
        args,
        { realm, authorization: a, tx }: Context
      ): Promise<null | string> {
        return a && (await authority.isAccessibleBy(realm, a, tx, "read.*"))
          ? authority.details.clientSecret
          : null;
      }
    },
    restrictToHostedDomains: {
      type: new GraphQLList(GraphQLString),
      description: "Restrict to accounts controlled by these hosted domains.",
      async resolve(
        authority,
        args,
        { realm, authorization: a, tx }: Context
      ): Promise<null | string[]> {
        return a && (await authority.isAccessibleBy(realm, a, tx, "read.*"))
          ? authority.details.restrictToHostedDomains
          : null;
      }
    },
    emailAuthorityId: {
      type: GraphQLString,
      description: "The ID of the email authority.",
      async resolve(
        authority,
        args,
        { realm, authorization: a, tx }: Context
      ): Promise<null | string> {
        return a && (await authority.isAccessibleBy(realm, a, tx, "read.*"))
          ? authority.details.emailAuthorityId
          : null;
      }
    },
    matchUsersByEmail: {
      type: GraphQLBoolean,
      description:
        "If no credential exists for the given OpenID provider, should we lookup the user by email address?",
      async resolve(
        authority,
        args,
        { realm, authorization: a, tx }: Context
      ): Promise<null | boolean> {
        return a && (await authority.isAccessibleBy(realm, a, tx, "read.*"))
          ? authority.details.matchUsersByEmail
          : null;
      }
    },
    createUnmatchedUsers: {
      type: GraphQLBoolean,
      description:
        "If no credential exists for the given OpenID provider, should we create a new one?",
      async resolve(
        authority,
        args,
        { realm, authorization: a, tx }: Context
      ): Promise<null | boolean> {
        return a && (await authority.isAccessibleBy(realm, a, tx, "read.*"))
          ? authority.details.createUnmatchedUsers
          : null;
      }
    },
    assignCreatedUsersToRoleIds: {
      type: new GraphQLNonNull(
        new GraphQLList(new GraphQLNonNull(GraphQLID))
      ) as any,
      description: "When a user is created, assign to these roles.",
      async resolve(
        authority,
        args,
        { realm, authorization: a, tx }: Context
      ): Promise<null | string[]> {
        return a && (await authority.isAccessibleBy(realm, a, tx, "read.*"))
          ? authority.details.assignCreatedUsersToRoleIds
          : null;
      }
    }
  })
});
