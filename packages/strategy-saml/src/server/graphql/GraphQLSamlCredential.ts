import {
  GraphQLBoolean,
  GraphQLID,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLString,
} from "graphql";

import {
  Context,
  GraphQLCredential,
  GraphQLNode,
  GraphQLUser,
  User,
} from "@authx/authx";
import { SamlAuthority, SamlCredential } from "../model";
import { GraphQLSamlAuthority } from "./GraphQLSamlAuthority";

// Credential
// ----------

export const GraphQLSamlCredential = new GraphQLObjectType<
  SamlCredential,
  Context
>({
  name: "SamlCredential",
  interfaces: () => [GraphQLNode, GraphQLCredential],
  isTypeOf: (value: any): boolean => value instanceof SamlCredential,
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
      type: GraphQLSamlAuthority,
      async resolve(
        credential,
        args,
        { executor }: Context
      ): Promise<null | SamlAuthority> {
        return credential.authority(executor);
      },
    },
    nameId: {
      type: GraphQLString,
      resolve(credential): string {
        return credential.authorityUserId;
      },
    },
  }),
});
