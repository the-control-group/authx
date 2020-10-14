import { GraphQLObjectType, GraphQLString, GraphQLNonNull } from "graphql";
import { GraphQLRole } from "./GraphQLRole";
import { GraphQLEdge } from "./GraphQLEdge";

export const GraphQLRoleEdge = new GraphQLObjectType({
  name: "RoleEdge",
  interfaces: () => [GraphQLEdge],
  fields: () => ({
    cursor: { type: new GraphQLNonNull(GraphQLString) },
    node: { type: GraphQLRole },
  }),
});
