// @flow

import {
  GraphQLFloat,
  GraphQLID,
  GraphQLInt,
  GraphQLString,
  GraphQLList,
  GraphQLNonNull,
  GraphQLObjectType
} from "graphql";

import GraphQLJSON from "graphql-type-json";
import { GraphQLCredential } from "./GraphQLCredential";

export const GraphQLUser: GraphQLObjectType = new GraphQLObjectType({
  name: "User",
  interfaces: () => [],
  fields: () => ({
    id: { type: new GraphQLNonNull(GraphQLID) },
    type: { type: GraphQLString },
    profile: { type: GraphQLJSON },
    credentials: { type: new GraphQLList(GraphQLCredential) }
  })
});
