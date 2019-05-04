import {
  GraphQLID,
  GraphQLNonNull,
  GraphQLString,
  GraphQLObjectType
} from "graphql";

import { OpenIdCredential, OpenIdAuthority } from "../model";
import { User } from "../../../model";
import {
  GraphQLCredential,
  GraphQLUser,
  GraphQLContact
} from "../../../graphql";
import { GraphQLOpenIdAuthority } from "./GraphQLOpenIdAuthority";
import { Context } from "../../../Context";

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
    },
    authorityUserId: { type: GraphQLString },
    contact: { type: GraphQLContact }
  })
});
