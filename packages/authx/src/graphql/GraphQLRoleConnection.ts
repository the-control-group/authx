import { GraphQLList, GraphQLNonNull, GraphQLObjectType } from "graphql";
import { GraphQLPageInfo } from "./GraphQLPageInfo.js";
import { GraphQLRoleEdge } from "./GraphQLRoleEdge.js";
import { GraphQLConnection } from "./GraphQLConnection.js";

export const GraphQLRoleConnection = new GraphQLObjectType({
  name: "RoleConnection",
  interfaces: () => [GraphQLConnection],
  fields: () => ({
    pageInfo: { type: new GraphQLNonNull(GraphQLPageInfo) },
    edges: { type: new GraphQLList(GraphQLRoleEdge) },
  }),
});
