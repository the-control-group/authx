import {
  GraphQLID,
  GraphQLNonNull,
  GraphQLString,
  GraphQLBoolean,
  GraphQLObjectType,
} from "graphql";

import { PasswordCredential, PasswordAuthority } from "../model";
import { GraphQLPasswordAuthority } from "./GraphQLPasswordAuthority";
import {
  User,
  GraphQLCredential,
  GraphQLUser,
  GraphQLNode,
  Context,
} from "@authx/authx";

// Credential
// ----------

export const GraphQLPasswordCredential = new GraphQLObjectType<
  PasswordCredential,
  Context
>({
  name: "PasswordCredential",
  interfaces: () => [GraphQLNode, GraphQLCredential],
  isTypeOf: (value: any): boolean => value instanceof PasswordCredential,
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
      type: GraphQLPasswordAuthority,
      async resolve(
        credential,
        args,
        { executor }: Context
      ): Promise<null | PasswordAuthority> {
        return credential.authority(executor);
      },
    },
    subject: {
      type: GraphQLString,
      resolve(credential): string {
        return credential.authorityUserId;
      },
    },
    hash: {
      type: GraphQLString,
      async resolve(
        credential,
        args,
        { realm, authorization: a, executor }: Context
      ): Promise<null | string> {
        return a &&
          (await credential.isAccessibleBy(realm, a, executor, {
            basic: "r",
            details: "r",
          }))
          ? credential.details.hash
          : null;
      },
    },
  }),
});
