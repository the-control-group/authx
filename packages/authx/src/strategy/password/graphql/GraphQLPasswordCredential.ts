import {
  GraphQLID,
  GraphQLNonNull,
  GraphQLString,
  GraphQLBoolean,
  GraphQLObjectType
} from "graphql";

import { PasswordCredential, PasswordAuthority } from "../model";
import { User } from "../../../model";
import { GraphQLCredential, GraphQLUser } from "../../../graphql";
import { GraphQLPasswordAuthority } from "./GraphQLPasswordAuthority";
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
      type: GraphQLPasswordAuthority,
      async resolve(
        credential,
        args,
        { tx }: Context
      ): Promise<null | PasswordAuthority> {
        return credential.authority(tx);
      }
    },
    authorityUserId: { type: GraphQLString },
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
