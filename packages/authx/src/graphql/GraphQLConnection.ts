import { GraphQLList, GraphQLNonNull, GraphQLInterfaceType } from "graphql";
import { GraphQLPageInfo } from "./GraphQLPageInfo.js";
import { GraphQLEdge } from "./GraphQLEdge.js";

export const GraphQLConnection = new GraphQLInterfaceType({
  name: "Connection",
  fields: () => ({
    pageInfo: { type: new GraphQLNonNull(GraphQLPageInfo) },
    edges: { type: new GraphQLList(GraphQLEdge) },
  }),
});
