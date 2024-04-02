import {
  GraphQLID,
  GraphQLList,
  GraphQLNonNull,
  GraphQLString,
  GraphQLBoolean,
  GraphQLObjectType,
  GraphQLFieldConfigMap,
} from "graphql";

import {
  connectionFromArray,
  connectionArgs,
  ConnectionArguments,
} from "graphql-relay";

import { Role } from "../model/index.js";
import { Context } from "../Context.js";
import { GraphQLUserConnection } from "./GraphQLUserConnection.js";
import { GraphQLScopeTemplate } from "./GraphQLScopeTemplate.js";
import { GraphQLNode } from "./GraphQLNode.js";
import { filter } from "../util/filter.js";

export const GraphQLRole = new GraphQLObjectType<Role, Context>({
  name: "Role",
  interfaces: () => [GraphQLNode],
  fields: (): GraphQLFieldConfigMap<Role, Context> => ({
    id: { type: new GraphQLNonNull(GraphQLID) },
    enabled: {
      type: new GraphQLNonNull(GraphQLBoolean),
    },
    name: { type: GraphQLString },
    description: { type: GraphQLString },
    users: {
      type: GraphQLUserConnection,

      // TODO: The type definitions in graphql-js are garbage, and will be
      // refactored shortly.
      args: connectionArgs as any,
      async resolve(
        role,
        args: ConnectionArguments,
        { realm, authorization: a, executor }: Context,
      ) {
        return a &&
          (await role.isAccessibleBy(realm, a, executor, {
            basic: "r",
            scopes: "",
            users: "r",
          }))
          ? connectionFromArray(
              await filter(await role.users(executor), (user) =>
                user.isAccessibleBy(realm, a, executor),
              ),
              args,
            )
          : null;
      },
    },
    scopes: {
      type: new GraphQLList(GraphQLScopeTemplate),
      async resolve(
        role,
        args,
        { realm, authorization: a, executor }: Context,
      ): Promise<null | string[]> {
        return a &&
          (await role.isAccessibleBy(realm, a, executor, {
            basic: "r",
            scopes: "r",
            users: "",
          }))
          ? role.scopes
          : null;
      },
    },
  }),
});
