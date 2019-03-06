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

import GraphQLJSON from "graphql-type-json";

export const GraphQLClient = new GraphQLObjectType({
  name: "Client",
  interfaces: () => [],
  fields: () => ({
    id: { type: new GraphQLNonNull(GraphQLID) },
    name: { type: GraphQLString },
    secret: { type: GraphQLString },
    scopes: { type: new GraphQLList(GraphQLString) },
    baseUrls: { type: new GraphQLList(GraphQLString) }
  })
});


