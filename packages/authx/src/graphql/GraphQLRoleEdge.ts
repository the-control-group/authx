import { GraphQLObjectType, GraphQLString, GraphQLNonNull } from "graphql";
import { GraphQLRole } from "./GraphQLRole.js";
import { GraphQLEdge } from "./GraphQLEdge.js";

export const GraphQLRoleEdge = new GraphQLObjectType({
  name: "RoleEdge",
  interfaces: () => [GraphQLEdge],
  fields: () => ({
    cursor: { type: new GraphQLNonNull(GraphQLString) },
    node: { type: GraphQLRole },
  }),
});
