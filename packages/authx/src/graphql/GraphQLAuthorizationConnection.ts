import { GraphQLList, GraphQLNonNull, GraphQLObjectType } from "graphql";
import { GraphQLPageInfo } from "./GraphQLPageInfo.js";
import { GraphQLAuthorizationEdge } from "./GraphQLAuthorizationEdge.js";
import { GraphQLConnection } from "./GraphQLConnection.js";

export const GraphQLAuthorizationConnection = new GraphQLObjectType({
  name: "AuthorizationConnection",
  interfaces: () => [GraphQLConnection],
  fields: () => ({
    pageInfo: { type: new GraphQLNonNull(GraphQLPageInfo) },
    edges: { type: new GraphQLList(GraphQLAuthorizationEdge) },
  }),
});
