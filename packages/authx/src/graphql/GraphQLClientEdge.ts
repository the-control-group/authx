import { GraphQLObjectType, GraphQLString, GraphQLNonNull } from "graphql";
import { GraphQLClient } from "./GraphQLClient";
import { GraphQLEdge } from "./GraphQLEdge";

export const GraphQLClientEdge = new GraphQLObjectType({
  name: "ClientEdge",
  interfaces: () => [GraphQLEdge],
  fields: () => ({
    cursor: { type: new GraphQLNonNull(GraphQLString) },
    node: { type: GraphQLClient }
  })
});
