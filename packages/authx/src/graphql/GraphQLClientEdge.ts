import { GraphQLObjectType, GraphQLString, GraphQLNonNull } from "graphql";
import { GraphQLClient } from "./GraphQLClient.js";
import { GraphQLEdge } from "./GraphQLEdge.js";

export const GraphQLClientEdge = new GraphQLObjectType({
  name: "ClientEdge",
  interfaces: () => [GraphQLEdge],
  fields: () => ({
    cursor: { type: new GraphQLNonNull(GraphQLString) },
    node: { type: GraphQLClient },
  }),
});
