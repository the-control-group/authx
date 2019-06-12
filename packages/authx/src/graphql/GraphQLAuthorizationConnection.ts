import { GraphQLList, GraphQLNonNull, GraphQLObjectType } from "graphql";
import { GraphQLPageInfo } from "./GraphQLPageInfo";
import { GraphQLAuthorizationEdge } from "./GraphQLAuthorizationEdge";

export const GraphQLAuthorizationConnection = new GraphQLObjectType({
  name: "AuthorizationConnection",
  fields: () => ({
    pageInfo: { type: new GraphQLNonNull(GraphQLPageInfo) },
    edges: { type: new GraphQLList(GraphQLAuthorizationEdge) }
  })
});
