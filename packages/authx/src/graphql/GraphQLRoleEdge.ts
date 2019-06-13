import { GraphQLObjectType, GraphQLString } from "graphql";
import { GraphQLRole } from "./GraphQLRole";

export const GraphQLRoleEdge = new GraphQLObjectType({
  name: "RoleEdge",
  fields: () => ({
    cursor: { type: GraphQLString },
    node: { type: GraphQLRole }
  })
});
