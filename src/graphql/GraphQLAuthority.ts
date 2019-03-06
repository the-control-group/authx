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

export const GraphQLAuthority = new GraphQLObjectType({
  name: "Authority",
  interfaces: () => [],
  fields: () => ({
    id: { type: new GraphQLNonNull(GraphQLID) },
    strategy: { type: GraphQLString },
    name: { type: GraphQLString },
    details: { type: GraphQLJSON }
  })
});


