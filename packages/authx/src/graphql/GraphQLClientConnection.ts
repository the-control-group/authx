import { GraphQLList, GraphQLNonNull, GraphQLObjectType } from "graphql";
import { GraphQLPageInfo } from "./GraphQLPageInfo";
import { GraphQLClientEdge } from "./GraphQLClientEdge";

export const GraphQLClientConnection = new GraphQLObjectType({
  name: "ClientConnection",
  fields: () => ({
    pageInfo: { type: new GraphQLNonNull(GraphQLPageInfo) },
    edges: { type: new GraphQLList(GraphQLClientEdge) }
  })
});
