// @flow

import {
  GraphQLFloat,
  GraphQLID,
  GraphQLInt,
  GraphQLList,
  GraphQLNonNull,
  GraphQLString,
  GraphQLInterfaceType
} from "graphql";

import GraphQLJSON from "graphql-type-json";

export const GraphQLAuthority = new GraphQLInterfaceType({
  name: "Authority",
  fields: () => ({
    id: { type: new GraphQLNonNull(GraphQLID) },
    strategy: { type: GraphQLString },
    name: { type: GraphQLString },
    details: { type: GraphQLJSON }
  })
});


