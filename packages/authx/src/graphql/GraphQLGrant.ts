import {
  GraphQLID,
  GraphQLList,
  GraphQLNonNull,
  GraphQLString,
  GraphQLBoolean,
  GraphQLObjectType
} from "graphql";

import {
  connectionFromArray,
  connectionArgs,
  ConnectionArguments
} from "graphql-relay";

import { Grant, Client, User } from "../model";
import { Context } from "../Context";
import { GraphQLClient } from "./GraphQLClient";
import { GraphQLUser } from "./GraphQLUser";
import { GraphQLAuthorizationConnection } from "./GraphQLAuthorizationConnection";
import { GraphQLScope } from "./GraphQLScope";
import { filter } from "../util/filter";

export const GraphQLGrant: GraphQLObjectType<
  Grant,
  Context
> = new GraphQLObjectType<Grant, Context>({
  name: "Grant",
  interfaces: () => [],
  fields: () => ({
    id: { type: new GraphQLNonNull(GraphQLID) },
    enabled: {
      type: new GraphQLNonNull(GraphQLBoolean)
    },
    user: {
      type: GraphQLUser,
      async resolve(
        grant,
        args,
        { realm, authorization: a, pool }: Context
      ): Promise<null | User> {
        const tx = await pool.connect();
        try {
          if (!a) return null;
          const user = await grant.user(tx);
          return user.isAccessibleBy(realm, a, tx) ? user : null;
        } finally {
          tx.release();
        }
      }
    },
    client: {
      type: GraphQLClient,
      async resolve(
        grant,
        args,
        { realm, authorization: a, pool }: Context
      ): Promise<null | Client> {
        const tx = await pool.connect();
        try {
          if (!a) return null;
          const client = await grant.client(tx);
          return client.isAccessibleBy(realm, a, tx) ? client : null;
        } finally {
          tx.release();
        }
      }
    },
    secrets: {
      type: new GraphQLList(GraphQLString),
      async resolve(
        grant,
        args,
        { realm, authorization: a, pool }: Context
      ): Promise<null | string[]> {
        const tx = await pool.connect();
        try {
          return a && (await grant.isAccessibleBy(realm, a, tx, "r...r."))
            ? [...grant.secrets]
            : null;
        } finally {
          tx.release();
        }
      }
    },
    codes: {
      type: new GraphQLList(GraphQLString),
      async resolve(
        grant,
        args,
        { realm, authorization: a, pool }: Context
      ): Promise<null | string[]> {
        const tx = await pool.connect();
        try {
          return a && (await grant.isAccessibleBy(realm, a, tx, "r...r."))
            ? [...grant.codes]
            : null;
        } finally {
          tx.release();
        }
      }
    },
    scopes: {
      type: new GraphQLList(GraphQLScope),
      async resolve(
        grant,
        args,
        { realm, authorization: q, pool }: Context
      ): Promise<null | string[]> {
        const tx = await pool.connect();
        try {
          return q && (await grant.isAccessibleBy(realm, q, tx, "r..r.."))
            ? grant.scopes
            : null;
        } finally {
          tx.release();
        }
      }
    },
    authorizations: {
      type: GraphQLAuthorizationConnection,
      args: connectionArgs,
      async resolve(
        grant,
        args: ConnectionArguments,
        { realm, authorization: a, pool }: Context
      ) {
        const tx = await pool.connect();
        try {
          return a
            ? connectionFromArray(
                await filter(await grant.authorizations(tx), authorization =>
                  authorization.isAccessibleBy(realm, a, tx)
                ),
                args
              )
            : null;
        } finally {
          tx.release();
        }
      }
    }
  })
});
