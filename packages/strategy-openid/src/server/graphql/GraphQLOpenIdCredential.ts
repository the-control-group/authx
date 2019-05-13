import {
  GraphQLID,
  GraphQLNonNull,
  GraphQLBoolean,
  GraphQLObjectType
} from "graphql";

import { User, GraphQLCredential, GraphQLUser, Context } from "@authx/authx";
import { OpenIdCredential, OpenIdAuthority } from "../model";
import { GraphQLOpenIdAuthority } from "./GraphQLOpenIdAuthority";

// Credential
// ----------

export const GraphQLOpenIdCredential = new GraphQLObjectType<
  OpenIdCredential,
  Context
>({
  name: "OpenIdCredential",
  interfaces: () => [GraphQLCredential],
  isTypeOf: (value: any): boolean => value instanceof OpenIdCredential,
  fields: () => ({
    id: { type: new GraphQLNonNull(GraphQLID) },
    enabled: {
      type: new GraphQLNonNull(GraphQLBoolean)
    },
    user: {
      type: GraphQLUser,
      async resolve(
        credential,
        args,
        { realm, authorization: a, tx }: Context
      ): Promise<null | User> {
        if (!a) return null;
        const user = await credential.user(tx);
        return user.isAccessibleBy(realm, a, tx) ? user : null;
      }
    },
    authority: {
      type: GraphQLOpenIdAuthority,
      async resolve(
        credential,
        args,
        { tx }: Context
      ): Promise<null | OpenIdAuthority> {
        return credential.authority(tx);
      }
    }
  })
});
