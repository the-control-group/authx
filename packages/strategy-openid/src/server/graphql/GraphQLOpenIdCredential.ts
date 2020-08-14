import {
  GraphQLID,
  GraphQLNonNull,
  GraphQLBoolean,
  GraphQLString,
  GraphQLObjectType,
} from "graphql";

import {
  User,
  GraphQLCredential,
  GraphQLUser,
  GraphQLNode,
  Context,
} from "@authx/authx";
import { OpenIdCredential, OpenIdAuthority } from "../model";
import { GraphQLOpenIdAuthority } from "./GraphQLOpenIdAuthority";

// Credential
// ----------

export const GraphQLOpenIdCredential = new GraphQLObjectType<
  OpenIdCredential,
  Context
>({
  name: "OpenIdCredential",
  interfaces: () => [GraphQLNode, GraphQLCredential],
  isTypeOf: (value: any): boolean => value instanceof OpenIdCredential,
  fields: () => ({
    id: { type: new GraphQLNonNull(GraphQLID) },
    enabled: {
      type: new GraphQLNonNull(GraphQLBoolean),
    },
    user: {
      type: GraphQLUser,
      async resolve(
        credential,
        args,
        { realm, authorization: a, executor }: Context
      ): Promise<null | User> {
        if (!a) return null;
        const user = await credential.user(executor);
        return user.isAccessibleBy(realm, a, executor) ? user : null;
      },
    },
    authority: {
      type: GraphQLOpenIdAuthority,
      async resolve(
        credential,
        args,
        { executor }: Context
      ): Promise<null | OpenIdAuthority> {
        return credential.authority(executor);
      },
    },
    subject: {
      type: GraphQLString,
      resolve(credential): string {
        return credential.authorityUserId;
      },
    },
  }),
});
