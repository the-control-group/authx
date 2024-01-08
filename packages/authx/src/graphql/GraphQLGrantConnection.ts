import { GraphQLList, GraphQLNonNull, GraphQLObjectType } from "graphql";
import { GraphQLPageInfo } from "./GraphQLPageInfo.js";
import { GraphQLGrantEdge } from "./GraphQLGrantEdge.js";
import { GraphQLConnection } from "./GraphQLConnection.js";

export const GraphQLGrantConnection = new GraphQLObjectType({
  name: "GrantConnection",
  interfaces: () => [GraphQLConnection],
  fields: () => ({
    pageInfo: { type: new GraphQLNonNull(GraphQLPageInfo) },
    edges: { type: new GraphQLList(GraphQLGrantEdge) },
  }),
});
