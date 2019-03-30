import {
  GraphQLID,
  GraphQLNonNull,
  GraphQLString,
  GraphQLObjectType
} from "graphql";

import { PasswordCredential, PasswordCredentialDetails } from "../model";
import { User } from "../../../model";
import {
  GraphQLAuthority,
  GraphQLCredential,
  GraphQLUser,
  GraphQLContact
} from "../../../graphql";
import { Context } from "../../../Context";

// Credential
// ----------

export const GraphQLPasswordCredentialDetails = new GraphQLObjectType({
  name: "PasswordCredentialDetails",
  fields: () => ({
    hash: { type: GraphQLString }
  })
});

export const GraphQLPasswordCredential = new GraphQLObjectType<
  PasswordCredential,
  Context
>({
  name: "PasswordCredential",
  interfaces: () => [GraphQLCredential],
  isTypeOf: (value: any): boolean => value instanceof PasswordCredential,
  fields: () => ({
    id: { type: new GraphQLNonNull(GraphQLID) },
    user: {
      type: GraphQLUser,
      async resolve(
        credential,
        args,
        { realm, token: t, tx }: Context
      ): Promise<null | User> {
        if (!t) return null;
        const user = await credential.user(tx);
        return user.isAccessibleBy(realm, t, tx) ? user : null;
      }
    },
    authority: { type: GraphQLAuthority },
    authorityUserId: { type: GraphQLString },
    details: {
      type: GraphQLPasswordCredentialDetails,
      async resolve(
        credential,
        args,
        { realm, token: t, tx }: Context
      ): Promise<null | PasswordCredentialDetails> {
        return t &&
          (await credential.isAccessibleBy(realm, t, tx, "read.details"))
          ? credential.details
          : null;
      }
    },
    contact: { type: GraphQLContact }
  })
});
