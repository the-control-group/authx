import { GraphQLObjectType, GraphQLString, GraphQLNonNull } from "graphql";
import { GraphQLGrant } from "./GraphQLGrant.js";
import { GraphQLEdge } from "./GraphQLEdge.js";

export const GraphQLGrantEdge = new GraphQLObjectType({
  name: "GrantEdge",
  interfaces: () => [GraphQLEdge],
  fields: () => ({
    cursor: { type: new GraphQLNonNull(GraphQLString) },
    node: { type: GraphQLGrant },
  }),
});
