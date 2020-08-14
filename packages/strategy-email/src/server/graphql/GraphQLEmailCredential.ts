import {
  GraphQLID,
  GraphQLNonNull,
  GraphQLBoolean,
  GraphQLString,
  GraphQLObjectType
} from "graphql";

import {
  User,
  GraphQLCredential,
  GraphQLUser,
  GraphQLNode,
  Context
} from "@authx/authx";
import { EmailCredential, EmailAuthority } from "../model";
import { GraphQLEmailAuthority } from "./GraphQLEmailAuthority";

// Credential
// ----------

export const GraphQLEmailCredential = new GraphQLObjectType<
  EmailCredential,
  Context
>({
  name: "EmailCredential",
  interfaces: () => [GraphQLNode, GraphQLCredential],
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
        { realm, authorization: a, executor }: Context
      ): Promise<null | User> {
        if (!a) return null;
        const user = await credential.user(executor);
        return user.isAccessibleBy(realm, a, executor) ? user : null;
      }
    },
    authority: {
      type: GraphQLEmailAuthority,
      async resolve(
        credential,
        args,
        { executor }: Context
      ): Promise<null | EmailAuthority> {
        return credential.authority(executor);
      }
    },
    email: {
      type: GraphQLString,
      resolve(credential): string {
        return credential.authorityUserId;
      }
    }
  })
});
