import { GraphQLList, GraphQLNonNull, GraphQLObjectType } from "graphql";
import { GraphQLPageInfo } from "./GraphQLPageInfo";
import { GraphQLGrantEdge } from "./GraphQLGrantEdge";

export const GraphQLGrantConnection = new GraphQLObjectType({
  name: "GrantConnection",
  fields: () => ({
    pageInfo: { type: new GraphQLNonNull(GraphQLPageInfo) },
    edges: { type: new GraphQLList(GraphQLGrantEdge) }
  })
});
