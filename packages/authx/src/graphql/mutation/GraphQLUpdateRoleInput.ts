import {
  GraphQLID,
  GraphQLList,
  GraphQLNonNull,
  GraphQLString,
  GraphQLBoolean,
  GraphQLInputObjectType
} from "graphql";

export const GraphQLUpdateRoleInput = new GraphQLInputObjectType({
  name: "UpdateRoleInput",
  fields: () => ({
    id: {
      type: new GraphQLNonNull(GraphQLID)
    },
    enabled: {
      type: GraphQLBoolean,
      defaultValue: true
    },
    name: {
      type: GraphQLString
    },
    description: {
      type: GraphQLString
    },
    scopes: {
      type: new GraphQLList(new GraphQLNonNull(GraphQLString))
    },
    assignUserIds: {
      type: new GraphQLList(new GraphQLNonNull(GraphQLString))
    },
    unassignUserIds: {
      type: new GraphQLList(new GraphQLNonNull(GraphQLString))
    }
  })
});
