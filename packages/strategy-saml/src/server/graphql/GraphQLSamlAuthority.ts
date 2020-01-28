import {
  GraphQLID,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLBoolean,
  GraphQLList,
  GraphQLString
} from "graphql";

import { GraphQLAuthority, GraphQLRole, Context, Role } from "@authx/authx";
import { SamlAuthority } from "../model";

export async function filter<T>(
  iter: Iterable<T>,
  callback: (item: T, index: number) => boolean | Promise<boolean>
): Promise<T[]> {
  const result: T[] = [];
  await Promise.all(
    [...iter].map(async (item: T, index: number) => {
      if (await callback(item, index)) result.push(item);
    })
  );

  return result;
}

// Authority
// ---------

export const GraphQLSamlAuthority = new GraphQLObjectType<
  SamlAuthority,
  Context
>({
  name: "SamlAuthority",
  interfaces: () => [GraphQLAuthority],
  isTypeOf: (value: any): boolean => value instanceof SamlAuthority,
  fields: () => ({
    id: { type: new GraphQLNonNull(GraphQLID) },
    enabled: {
      type: new GraphQLNonNull(GraphQLBoolean)
    },
    name: { type: GraphQLString },
    description: { type: GraphQLString },
    authUrl: {
      type: new GraphQLNonNull(GraphQLString),
      description: "The URL to which a user is directed to authenticate.",
      async resolve(authority, {}, { base }): Promise<string> {
        return await authority.loginRequestUrl(base);
      }
    },
    privateKey: {
      type: new GraphQLList(GraphQLString),
      description: "",
      async resolve(
        authority,
        args,
        { realm, authorization: a, pool }: Context
      ): Promise<null | string[]> {
        const tx = await pool.connect();
        try {
          return a &&
            (await authority.isAccessibleBy(realm, a, tx, {
              basic: "r",
              details: "r"
            }))
            ? authority.details.privateKeys
            : null;
        } finally {
          tx.release();
        }
      }
    },

    certificates: {
      type: new GraphQLList(GraphQLString),
      description: "",
      async resolve(
        authority,
        args,
        { realm, authorization: a, pool }: Context
      ): Promise<null | string[]> {
        const tx = await pool.connect();
        try {
          return a &&
            (await authority.isAccessibleBy(realm, a, tx, {
              basic: "r",
              details: "r"
            }))
            ? authority.details.certificates
            : null;
        } finally {
          tx.release();
        }
      }
    },
    forcesReauthentication: {
      type: GraphQLBoolean,
      description: "",
      async resolve(
        authority,
        args,
        { realm, authorization: a, pool }: Context
      ): Promise<null | boolean> {
        const tx = await pool.connect();
        try {
          return a &&
            (await authority.isAccessibleBy(realm, a, tx, {
              basic: "r",
              details: "r"
            }))
            ? authority.details.forcesReauthentication
            : null;
        } finally {
          tx.release();
        }
      }
    },
    defaultRedirect: {
      type: GraphQLString,
      description: "",
      async resolve(
        authority,
        args,
        { realm, authorization: a, pool }: Context
      ): Promise<null | string> {
        const tx = await pool.connect();
        try {
          return a &&
            (await authority.isAccessibleBy(realm, a, tx, {
              basic: "r",
              details: "r"
            }))
            ? authority.details.defaultRedirect
            : null;
        } finally {
          tx.release();
        }
      }
    }
  })
});
