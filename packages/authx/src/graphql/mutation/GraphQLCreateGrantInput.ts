import {
  GraphQLID,
  GraphQLList,
  GraphQLNonNull,
  GraphQLString,
  GraphQLBoolean,
  GraphQLInputObjectType
} from "graphql";

export const GraphQLCreateGrantInput = new GraphQLInputObjectType({
  name: "CreateGrantInput",
  fields: () => ({
    enabled: {
      type: GraphQLBoolean,
      defaultValue: true
    },
    userId: {
      type: new GraphQLNonNull(GraphQLID)
    },
    clientId: {
      type: new GraphQLNonNull(GraphQLID)
    },
    scopes: {
      type: new GraphQLNonNull(
        new GraphQLList(new GraphQLNonNull(GraphQLString))
      )
    }
  })
});
