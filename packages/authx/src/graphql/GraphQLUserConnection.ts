import { GraphQLList, GraphQLNonNull, GraphQLObjectType } from "graphql";
import { GraphQLPageInfo } from "./GraphQLPageInfo.js";
import { GraphQLUserEdge } from "./GraphQLUserEdge.js";
import { GraphQLConnection } from "./GraphQLConnection.js";

export const GraphQLUserConnection = new GraphQLObjectType({
  name: "UserConnection",
  interfaces: () => [GraphQLConnection],
  fields: () => ({
    pageInfo: { type: new GraphQLNonNull(GraphQLPageInfo) },
    edges: { type: new GraphQLList(GraphQLUserEdge) },
  }),
});
