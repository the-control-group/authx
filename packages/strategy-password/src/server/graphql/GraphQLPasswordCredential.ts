import {
  GraphQLID,
  GraphQLNonNull,
  GraphQLString,
  GraphQLBoolean,
  GraphQLObjectType
} from "graphql";

import { PasswordCredential, PasswordAuthority } from "../model";
import { GraphQLPasswordAuthority } from "./GraphQLPasswordAuthority";
import {
  User,
  GraphQLCredential,
  GraphQLUser,
  GraphQLNode,
  Context
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
      type: new GraphQLNonNull(GraphQLBoolean)
    },
    user: {
      type: GraphQLUser,
      async resolve(
        credential,
        args,
        { realm, authorization: a, pool }: Context
      ): Promise<null | User> {
        const tx = await pool.connect();
        try {
          if (!a) return null;
          const user = await credential.user(tx);
          return user.isAccessibleBy(realm, a, tx) ? user : null;
        } finally {
          tx.release();
        }
      }
    },
    authority: {
      type: GraphQLPasswordAuthority,
      async resolve(
        credential,
        args,
        { pool }: Context
      ): Promise<null | PasswordAuthority> {
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
    },
    hash: {
      type: GraphQLString,
      async resolve(
        credential,
        args,
        { realm, authorization: a, pool }: Context
      ): Promise<null | string> {
        const tx = await pool.connect();
        try {
          return a &&
            (await credential.isAccessibleBy(realm, a, tx, {
              basic: "r",
              details: "r"
            }))
            ? credential.details.hash
            : null;
        } finally {
          tx.release();
        }
      }
    }
  })
});
