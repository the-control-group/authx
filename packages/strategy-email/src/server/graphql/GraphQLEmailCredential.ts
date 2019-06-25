import {
  GraphQLID,
  GraphQLNonNull,
  GraphQLBoolean,
  GraphQLString,
  GraphQLObjectType
} from "graphql";

import { User, GraphQLCredential, GraphQLUser, Context } from "@authx/authx";
import { EmailCredential, EmailAuthority } from "../model";
import { GraphQLEmailAuthority } from "./GraphQLEmailAuthority";

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
      type: GraphQLEmailAuthority,
      async resolve(
        credential,
        args,
        { pool }: Context
      ): Promise<null | EmailAuthority> {
        const tx = await pool.connect();
        try {
          return credential.authority(tx);
        } finally {
          tx.release();
        }
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
