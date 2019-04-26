import {
  GraphQLID,
  GraphQLNonNull,
  GraphQLString,
  GraphQLObjectType
} from "graphql";

import { EmailCredential, EmailCredentialDetails } from "../model";
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

export const GraphQLEmailCredentialDetails = new GraphQLObjectType({
  name: "EmailCredentialDetails",
  fields: () => ({
    hash: { type: GraphQLString }
  })
});

export const GraphQLEmailCredential = new GraphQLObjectType<
  EmailCredential,
  Context
>({
  name: "EmailCredential",
  interfaces: () => [GraphQLCredential],
  isTypeOf: (value: any): boolean => value instanceof EmailCredential,
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
    authority: { type: GraphQLAuthority },
    authorityUserId: { type: GraphQLString },
    details: {
      type: GraphQLEmailCredentialDetails,
      async resolve(
        credential,
        args,
        { realm, authorization: a, tx }: Context
      ): Promise<null | EmailCredentialDetails> {
        return a &&
          (await credential.isAccessibleBy(realm, a, tx, "read.details"))
          ? credential.details
          : null;
      }
    },
    contact: { type: GraphQLContact }
  })
});
