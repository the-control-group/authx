import {
  GraphQLID,
  GraphQLNonNull,
  GraphQLString,
  GraphQLObjectType
} from "graphql";

import { PasswordCredential } from "../model";
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
        { realm, authorization: a, tx }: Context
      ): Promise<null | User> {
        if (!a) return null;
        const user = await credential.user(tx);
        return user.isAccessibleBy(realm, a, tx) ? user : null;
      }
    },
    authority: { type: GraphQLAuthority },
    authorityUserId: { type: GraphQLString },
    contact: { type: GraphQLContact },
    hash: {
      type: GraphQLString,
      async resolve(
        credential,
        args,
        { realm, authorization: a, tx }: Context
      ): Promise<null | string> {
        return a && (await credential.isAccessibleBy(realm, a, tx, "read.*"))
          ? credential.details.hash
          : null;
      }
    }
  })
});
