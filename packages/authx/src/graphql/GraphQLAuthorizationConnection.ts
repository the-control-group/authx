import { GraphQLList, GraphQLNonNull, GraphQLObjectType } from "graphql";
import { GraphQLPageInfo } from "./GraphQLPageInfo";
import { GraphQLAuthorizationEdge } from "./GraphQLAuthorizationEdge";
import { GraphQLConnection } from "./GraphQLConnection";

export const GraphQLAuthorizationConnection = new GraphQLObjectType({
  name: "AuthorizationConnection",
  interfaces: () => [GraphQLConnection],
  fields: () => ({
    pageInfo: { type: new GraphQLNonNull(GraphQLPageInfo) },
    edges: { type: new GraphQLList(GraphQLAuthorizationEdge) },
  }),
});
