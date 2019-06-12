import { GraphQLList, GraphQLNonNull, GraphQLObjectType } from "graphql";
import { GraphQLPageInfo } from "./GraphQLPageInfo";
import { GraphQLRoleEdge } from "./GraphQLRoleEdge";

export const GraphQLRoleConnection = new GraphQLObjectType({
  name: "RoleConnection",
  fields: () => ({
    pageInfo: { type: new GraphQLNonNull(GraphQLPageInfo) },
    edges: { type: new GraphQLList(GraphQLRoleEdge) }
  })
});
