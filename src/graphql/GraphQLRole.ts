import {
  GraphQLID,
  GraphQLList,
  GraphQLNonNull,
  GraphQLString,
  GraphQLObjectType
} from "graphql";

import { PoolClient } from "pg";
import { GraphQLUser } from "./GraphQLUser";

export const GraphQLRole = new GraphQLObjectType({
  name: "Role",
  interfaces: () => [],
  fields: () => ({
    id: { type: new GraphQLNonNull(GraphQLID) },
    name: { type: GraphQLString },
    users: {
      type: new GraphQLList(GraphQLUser),
      resolve(role, args, context: { tx: PoolClient }) {
        return role.users(context.tx);
      }
    },
    scopes: { type: new GraphQLList(GraphQLString) }
  })
});
