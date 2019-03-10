// @flow

import {
  GraphQLFloat,
  GraphQLID,
  GraphQLInt,
  GraphQLList,
  GraphQLNonNull,
  GraphQLString,
  GraphQLObjectType
} from "graphql";

import { PoolQuery } from "pg";

import GraphQLJSON from "graphql-type-json";
import { GraphQLClient } from "./GraphQLClient";
import { GraphQLUser } from "./GraphQLUser";

export const GraphQLRole = new GraphQLObjectType({
  name: "Role",
  interfaces: () => [],
  fields: () => ({
    id: { type: new GraphQLNonNull(GraphQLID) },
    name: { type: GraphQLString },
    users: {
      type: new GraphQLList(GraphQLUser),
      resolve(role, args, context: { tx: PoolQuery }) {
        return [...role.assignments].map(a => a(context.tx));
      }
    },
    scopes: { type: new GraphQLList(GraphQLString) }
  })
});
