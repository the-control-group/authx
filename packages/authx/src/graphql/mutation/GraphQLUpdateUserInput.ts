import {
  GraphQLNonNull,
  GraphQLString,
  GraphQLBoolean,
  GraphQLInputObjectType,
  GraphQLID,
} from "graphql";

export const GraphQLUpdateUserInput = new GraphQLInputObjectType({
  name: "UpdateUserInput",
  fields: () => ({
    id: {
      type: new GraphQLNonNull(GraphQLID),
    },
    enabled: {
      type: GraphQLBoolean,
    },
    name: {
      type: GraphQLString,
    },
  }),
});
