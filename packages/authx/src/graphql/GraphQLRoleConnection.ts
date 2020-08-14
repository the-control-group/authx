import { GraphQLList, GraphQLNonNull, GraphQLObjectType } from "graphql";
import { GraphQLPageInfo } from "./GraphQLPageInfo";
import { GraphQLRoleEdge } from "./GraphQLRoleEdge";
import { GraphQLConnection } from "./GraphQLConnection";

export const GraphQLRoleConnection = new GraphQLObjectType({
  name: "RoleConnection",
  interfaces: () => [GraphQLConnection],
  fields: () => ({
    pageInfo: { type: new GraphQLNonNull(GraphQLPageInfo) },
    edges: { type: new GraphQLList(GraphQLRoleEdge) }
  })
});
