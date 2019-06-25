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

import { Client } from "../model";
import { Context } from "../Context";
import { GraphQLUserConnection } from "./GraphQLUserConnection";
import { filter } from "../util/filter";

export const GraphQLClient = new GraphQLObjectType<Client, Context>({
  name: "Client",
  interfaces: () => [],
  fields: () => ({
    id: { type: new GraphQLNonNull(GraphQLID) },
    enabled: {
      type: new GraphQLNonNull(GraphQLBoolean)
    },
    name: { type: GraphQLString },
    description: { type: GraphQLString },
    secrets: {
      type: new GraphQLList(GraphQLString),
      async resolve(
        client,
        args,
        { realm, authorization: a, pool }: Context
      ): Promise<null | string[]> {
        const tx = await pool.connect();
        try {
          return a &&
            (await client.isAccessibleBy(realm, a, tx, "read.secrets"))
            ? [...client.secrets]
            : null;
        } finally {
          tx.release();
        }
      }
    },
    urls: { type: new GraphQLList(GraphQLString) },
    users: {
      type: GraphQLUserConnection,
      args: connectionArgs,
      async resolve(
        client,
        args: ConnectionArguments,
        { realm, authorization: a, pool }: Context
      ) {
        const tx = await pool.connect();
        try {
          return a &&
            (await client.isAccessibleBy(realm, a, tx, "read.assignments"))
            ? connectionFromArray(
                await filter(await client.users(tx), user =>
                  user.isAccessibleBy(realm, a, tx)
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
