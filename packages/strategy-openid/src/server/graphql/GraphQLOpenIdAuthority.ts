import {
  GraphQLID,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLBoolean,
  GraphQLList,
  GraphQLString
} from "graphql";

import { GraphQLAuthority, GraphQLRole, Context, Role } from "@authx/authx";
import { GraphQLEmailAuthority, EmailAuthority } from "@authx/strategy-email";
import { OpenIdAuthority } from "../model";

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

export const GraphQLOpenIdAuthority = new GraphQLObjectType<
  OpenIdAuthority,
  Context
>({
  name: "OpenIdAuthority",
  interfaces: () => [GraphQLAuthority],
  isTypeOf: (value: any): boolean => value instanceof OpenIdAuthority,
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
      resolve(authority): string {
        return authority.details.authUrl;
      }
    },
    tokenUrl: {
      type: GraphQLString,
      description:
        "The URL used by AuthX to exchange an authorization code for an access token.",
      async resolve(
        authority,
        args,
        { realm, authorization: a, pool }: Context
      ): Promise<null | string> {
        const tx = await pool.connect();
        try {
          return a && (await authority.isAccessibleBy(realm, a, tx, "read.*"))
            ? authority.details.tokenUrl
            : null;
        } finally {
          tx.release();
        }
      }
    },
    clientId: {
      type: new GraphQLNonNull(GraphQLString),
      description: "The client ID of AuthX in with OpenID provider.",
      resolve(authority): string {
        return authority.details.clientId;
      }
    },
    clientSecret: {
      type: GraphQLString,
      description: "The AuthX client secret for OpenId.",
      async resolve(
        authority,
        args,
        { realm, authorization: a, pool }: Context
      ): Promise<null | string> {
        const tx = await pool.connect();
        try {
          return a && (await authority.isAccessibleBy(realm, a, tx, "read.*"))
            ? authority.details.clientSecret
            : null;
        } finally {
          tx.release();
        }
      }
    },
    restrictsAccountsToHostedDomains: {
      type: new GraphQLList(GraphQLString),
      description:
        "Restrict to accounts controlled by these hosted domains. If empty, accounts from any domain will be allowed.",
      async resolve(
        authority,
        args,
        { realm, authorization: a, pool }: Context
      ): Promise<null | string[]> {
        const tx = await pool.connect();
        try {
          return a && (await authority.isAccessibleBy(realm, a, tx, "read.*"))
            ? authority.details.restrictsAccountsToHostedDomains
            : null;
        } finally {
          tx.release();
        }
      }
    },
    emailAuthority: {
      type: GraphQLEmailAuthority,
      description: "The email authority.",
      async resolve(
        authority,
        args,
        { realm, authorization: a, pool }: Context
      ): Promise<null | EmailAuthority> {
        const tx = await pool.connect();
        try {
          if (!a || !(await authority.isAccessibleBy(realm, a, tx, "read.*"))) {
            return null;
          }

          const emailAuthority = await authority.emailAuthority(tx);
          return emailAuthority && emailAuthority.isAccessibleBy(realm, a, tx)
            ? emailAuthority
            : null;
        } finally {
          tx.release();
        }
      }
    },
    matchesUsersByEmail: {
      type: GraphQLBoolean,
      description:
        "If no credential exists for the given OpenID provider, should we lookup the user by email address?",
      async resolve(
        authority,
        args,
        { realm, authorization: a, pool }: Context
      ): Promise<null | boolean> {
        const tx = await pool.connect();
        try {
          return a && (await authority.isAccessibleBy(realm, a, tx, "read.*"))
            ? authority.details.matchesUsersByEmail
            : null;
        } finally {
          tx.release();
        }
      }
    },
    createsUnmatchedUsers: {
      type: GraphQLBoolean,
      description:
        "If no credential exists for the given OpenID provider, should we create a new one?",
      async resolve(
        authority,
        args,
        { realm, authorization: a, pool }: Context
      ): Promise<null | boolean> {
        const tx = await pool.connect();
        try {
          return a && (await authority.isAccessibleBy(realm, a, tx, "read.*"))
            ? authority.details.createsUnmatchedUsers
            : null;
        } finally {
          tx.release();
        }
      }
    },
    assignsCreatedUsersToRoles: {
      type: new GraphQLNonNull(
        new GraphQLList(new GraphQLNonNull(GraphQLRole))
      ) as any,
      description: "When a user is created, assign to these roles.",
      async resolve(
        authority,
        args,
        { realm, authorization: a, pool }: Context
      ): Promise<null | Role[]> {
        const tx = await pool.connect();
        try {
          if (!a || !(await authority.isAccessibleBy(realm, a, tx, "read.*"))) {
            return null;
          }

          return filter(await authority.assignsCreatedUsersToRoles(tx), role =>
            role.isAccessibleBy(realm, a, tx)
          );
        } finally {
          tx.release();
        }
      }
    }
  })
});
