import { GraphQLList, GraphQLNonNull, GraphQLObjectType } from "graphql";
import { GraphQLPageInfo } from "./GraphQLPageInfo";
import { GraphQLUserEdge } from "./GraphQLUserEdge";

export const GraphQLUserConnection = new GraphQLObjectType({
  name: "UserConnection",
  fields: () => ({
    pageInfo: { type: new GraphQLNonNull(GraphQLPageInfo) },
    edges: { type: new GraphQLList(GraphQLUserEdge) }
  })
});
