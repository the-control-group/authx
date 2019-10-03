import {
  GraphQLID,
  GraphQLNonNull,
  GraphQLBoolean,
  GraphQLString,
  GraphQLObjectType
} from "graphql";

import { User, GraphQLCredential, GraphQLUser, Context } from "@authx/authx";
import { SamlCredential, SamlAuthority } from "../model";
import { GraphQLSamlAuthority } from "./GraphQLSamlAuthority";

// Credential
// ----------

export const GraphQLSamlCredential = new GraphQLObjectType<
  SamlCredential,
  Context
>({
  name: "SamlCredential",
  interfaces: () => [GraphQLCredential],
  isTypeOf: (value: any): boolean => value instanceof SamlCredential,
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
      type: GraphQLSamlAuthority,
      async resolve(
        credential,
        args,
        { pool }: Context
      ): Promise<null | SamlAuthority> {
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
