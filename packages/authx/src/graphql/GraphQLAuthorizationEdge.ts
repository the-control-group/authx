import { GraphQLObjectType, GraphQLString } from "graphql";
import { GraphQLAuthorization } from "./GraphQLAuthorization";

export const GraphQLAuthorizationEdge = new GraphQLObjectType({
  name: "AuthorizationEdge",
  fields: () => ({
    cursor: { type: GraphQLString },
    node: { type: GraphQLAuthorization }
  })
});
