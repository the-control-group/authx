import { GraphQLObjectType, GraphQLString, GraphQLNonNull } from "graphql";
import { GraphQLUser } from "./GraphQLUser.js";
import { GraphQLEdge } from "./GraphQLEdge.js";

export const GraphQLUserEdge = new GraphQLObjectType({
  name: "UserEdge",
  interfaces: () => [GraphQLEdge],
  fields: () => ({
    cursor: { type: new GraphQLNonNull(GraphQLString) },
    node: { type: GraphQLUser },
  }),
});
