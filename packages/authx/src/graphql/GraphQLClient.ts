import {
  GraphQLID,
  GraphQLList,
  GraphQLNonNull,
  GraphQLString,
  GraphQLBoolean,
  GraphQLObjectType,
  GraphQLFieldConfigMap,
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
  fields: (): GraphQLFieldConfigMap<Client, Context> => ({
    id: { type: new GraphQLNonNull(GraphQLID) },
    enabled: {
      type: new GraphQLNonNull(GraphQLBoolean),
    },
    name: { type: GraphQLString },
    description: { type: GraphQLString },
    secrets: {
      type: new GraphQLList(GraphQLString),
      async resolve(
        client,
        args,
        { realm, authorization: a, executor }: Context
      ): Promise<null | string[]> {
        return a &&
          (await client.isAccessibleBy(realm, a, executor, {
            basic: "r",
            secrets: "r",
          }))
          ? [...client.secrets]
          : null;
      },
    },
    urls: { type: new GraphQLList(GraphQLString) },
    grants: {
      type: GraphQLGrantConnection,
      description: "List all of the client's grants.",

      // TODO: The type definitions in graphql-js are garbage, and will be
      // refactored shortly.
      args: connectionArgs as any,
      async resolve(
        client,
        args,
        { realm, authorization: a, executor }: Context
      ) {
        return a
          ? connectionFromArray(
              await filter(await client.grants(executor), (grant) =>
                grant.isAccessibleBy(realm, a, executor)
              ),
              args
            )
          : null;
      },
    },
    grant: {
      type: GraphQLGrant,
      args: {
        userId: {
          type: new GraphQLNonNull(GraphQLID),
          description: "The ID of a user.",
        },
      },
      description: "Look for a grant between this user and a client.",
      async resolve(
        client,
        args,
        { realm, authorization: a, executor }: Context
      ): Promise<null | Grant> {
        if (!a) return null;
        const grant = await client.grant(executor, args.userId);
        return grant && (await grant.isAccessibleBy(realm, a, executor)) ? grant : null;
      },
    },
  }),
});
