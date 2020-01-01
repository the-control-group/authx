import {
  GraphQLID,
  GraphQLList,
  GraphQLNonNull,
  GraphQLString,
  GraphQLBoolean,
  GraphQLObjectType
} from "graphql";

import { connectionFromArray, connectionArgs } from "graphql-relay";

import { Grant } from "../model";
import { Client } from "../model";
import { Context } from "../Context";
import { GraphQLGrant } from "./GraphQLGrant";
import { GraphQLGrantConnection } from "./GraphQLGrantConnection";
import { GraphQLNode } from "./GraphQLNode";
import { filter } from "../util/filter";

export const GraphQLClient = new GraphQLObjectType<Client, Context>({
  name: "Client",
  interfaces: () => [GraphQLNode],
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
            (await client.isAccessibleBy(realm, a, tx, {
              basic: "r",
              secrets: "r"
            }))
            ? [...client.secrets]
            : null;
        } finally {
          tx.release();
        }
      }
    },
    urls: { type: new GraphQLList(GraphQLString) },
    grants: {
      type: GraphQLGrantConnection,
      description: "List all of the client's grants.",
      args: connectionArgs,
      async resolve(client, args, { realm, authorization: a, pool }: Context) {
        const tx = await pool.connect();
        try {
          return a
            ? connectionFromArray(
                await filter(await client.grants(tx), grant =>
                  grant.isAccessibleBy(realm, a, tx)
                ),
                args
              )
            : null;
        } finally {
          tx.release();
        }
      }
    },
    grant: {
      type: GraphQLGrant,
      args: {
        userId: {
          type: new GraphQLNonNull(GraphQLID),
          description: "The ID of a user."
        }
      },
      description: "Look for a grant between this user and a client.",
      async resolve(
        client,
        args,
        { realm, authorization: a, pool }: Context
      ): Promise<null | Grant> {
        if (!a) return null;
        const tx = await pool.connect();
        try {
          const grant = await client.grant(tx, args.userId);
          return grant && grant.isAccessibleBy(realm, a, tx) ? grant : null;
        } finally {
          tx.release();
        }
      }
    }
  })
});
