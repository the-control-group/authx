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
import { OpenIdCredential, OpenIdAuthority } from "../model";
import { GraphQLOpenIdAuthority } from "./GraphQLOpenIdAuthority";

// Credential
// ----------

export const GraphQLOpenIdCredential = new GraphQLObjectType<
  OpenIdCredential,
  Context
>({
  name: "OpenIdCredential",
  interfaces: () => [GraphQLNode, GraphQLCredential],
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
        { realm, authorization: a, pool }: Context
      ): Promise<null | User> {
        if (!a) return null;
        const tx = await pool.connect();
        try {
          const user = await credential.user(tx);
          return user.isAccessibleBy(realm, a, tx) ? user : null;
        } finally {
          tx.release();
        }
      }
    },
    authority: {
      type: GraphQLOpenIdAuthority,
      async resolve(
        credential,
        args,
        { pool }: Context
      ): Promise<null | OpenIdAuthority> {
        const tx = await pool.connect();
        try {
          return credential.authority(tx);
        } finally {
          tx.release();
        }
      }
    },
    subject: {
      type: GraphQLString,
      resolve(credential): string {
        return credential.authorityUserId;
      }
    }
  })
});
