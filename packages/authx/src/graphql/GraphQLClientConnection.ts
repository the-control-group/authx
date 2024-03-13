import { GraphQLList, GraphQLNonNull, GraphQLObjectType } from "graphql";
import { GraphQLPageInfo } from "./GraphQLPageInfo.js";
import { GraphQLClientEdge } from "./GraphQLClientEdge.js";
import { GraphQLConnection } from "./GraphQLConnection.js";

export const GraphQLClientConnection = new GraphQLObjectType({
  name: "ClientConnection",
  interfaces: () => [GraphQLConnection],
  fields: () => ({
    pageInfo: { type: new GraphQLNonNull(GraphQLPageInfo) },
    edges: { type: new GraphQLList(GraphQLClientEdge) },
  }),
});
