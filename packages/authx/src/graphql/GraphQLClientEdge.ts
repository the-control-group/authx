import { GraphQLObjectType, GraphQLString } from "graphql";
import { GraphQLClient } from "./GraphQLClient";

export const GraphQLClientEdge = new GraphQLObjectType({
  name: "ClientEdge",
  fields: () => ({
    cursor: { type: GraphQLString },
    node: { type: GraphQLClient }
  })
});
