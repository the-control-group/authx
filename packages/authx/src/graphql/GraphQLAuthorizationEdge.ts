import { GraphQLObjectType, GraphQLString, GraphQLNonNull } from "graphql";
import { GraphQLAuthorization } from "./GraphQLAuthorization.js";
import { GraphQLEdge } from "./GraphQLEdge.js";

export const GraphQLAuthorizationEdge = new GraphQLObjectType({
  name: "AuthorizationEdge",
  interfaces: () => [GraphQLEdge],
  fields: () => ({
    cursor: { type: new GraphQLNonNull(GraphQLString) },
    node: { type: GraphQLAuthorization },
  }),
});
