import {
  GraphQLID,
  GraphQLList,
  GraphQLNonNull,
  GraphQLString,
  GraphQLBoolean,
  GraphQLInputObjectType
} from "graphql";

export const GraphQLCreateAuthorizationInput = new GraphQLInputObjectType({
  name: "CreateAuthorizationInput",
  fields: () => ({
    id: {
      type: GraphQLID,
      description: "Optional UUID to use for the new authorization."
    },
    enabled: {
      type: GraphQLBoolean,
      defaultValue: true
    },
    userId: {
      type: new GraphQLNonNull(GraphQLID)
    },
    grantId: {
      type: new GraphQLNonNull(GraphQLID)
    },
    scopes: {
      type: new GraphQLNonNull(
        new GraphQLList(new GraphQLNonNull(GraphQLString))
      )
    }
  })
});
