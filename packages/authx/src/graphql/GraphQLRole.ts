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

import { Role } from "../model";
import { Context } from "../Context";
import { GraphQLUserConnection } from "./GraphQLUserConnection";
import { GraphQLScopeTemplate } from "./GraphQLScopeTemplate";
import { GraphQLNode } from "./GraphQLNode";
import { filter } from "../util/filter";

export const GraphQLRole = new GraphQLObjectType<Role, Context>({
  name: "Role",
  interfaces: () => [GraphQLNode],
  fields: () => ({
    id: { type: new GraphQLNonNull(GraphQLID) },
    enabled: {
      type: new GraphQLNonNull(GraphQLBoolean)
    },
    name: { type: GraphQLString },
    description: { type: GraphQLString },
    users: {
      type: GraphQLUserConnection,
      args: connectionArgs,
      async resolve(
        role,
        args: ConnectionArguments,
        { realm, authorization: a, pool }: Context
      ) {
        const tx = await pool.connect();
        try {
          return a &&
            (await role.isAccessibleBy(realm, a, tx, {
              basic: "r",
              scopes: "",
              users: "r"
            }))
            ? connectionFromArray(
                await filter(await role.users(tx), user =>
                  user.isAccessibleBy(realm, a, tx)
                ),
                args
              )
            : null;
        } finally {
          tx.release();
        }
      }
    },
    scopes: {
      type: new GraphQLList(GraphQLScopeTemplate),
      async resolve(
        role,
        args,
        { realm, authorization: a, pool }: Context
      ): Promise<null | string[]> {
        const tx = await pool.connect();
        try {
          return a &&
            (await role.isAccessibleBy(realm, a, tx, {
              basic: "r",
              scopes: "r",
              users: ""
            }))
            ? role.scopes
            : null;
        } finally {
          tx.release();
        }
      }
    }
  })
});
