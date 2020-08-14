import { GraphQLList, GraphQLNonNull, GraphQLObjectType } from "graphql";
import { GraphQLPageInfo } from "./GraphQLPageInfo";
import { GraphQLUserEdge } from "./GraphQLUserEdge";
import { GraphQLConnection } from "./GraphQLConnection";

export const GraphQLUserConnection = new GraphQLObjectType({
  name: "UserConnection",
  interfaces: () => [GraphQLConnection],
  fields: () => ({
    pageInfo: { type: new GraphQLNonNull(GraphQLPageInfo) },
    edges: { type: new GraphQLList(GraphQLUserEdge) }
  })
});
