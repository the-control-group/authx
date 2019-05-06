import {
  GraphQLID,
  GraphQLNonNull,
  GraphQLBoolean,
  GraphQLString,
  GraphQLObjectType
} from "graphql";

import { EmailCredential, EmailAuthority } from "../model";
import { User } from "../../../model";
import { GraphQLCredential, GraphQLUser } from "../../../graphql";
import { GraphQLEmailAuthority } from "./GraphQLEmailAuthority";
import { Context } from "../../../Context";

// Credential
// ----------

export const GraphQLEmailCredential = new GraphQLObjectType<
  EmailCredential,
  Context
>({
  name: "EmailCredential",
  interfaces: () => [GraphQLCredential],
  isTypeOf: (value: any): boolean => value instanceof EmailCredential,
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
      type: GraphQLEmailAuthority,
      async resolve(
        credential,
        args,
        { tx }: Context
      ): Promise<null | EmailAuthority> {
        return credential.authority(tx);
      }
    },
    authorityUserId: { type: GraphQLString }
  })
});
