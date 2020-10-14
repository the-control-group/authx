import {
  GraphQLID,
  GraphQLNonNull,
  GraphQLBoolean,
  GraphQLInputObjectType,
} from "graphql";

export const GraphQLUpdateAuthorizationInput = new GraphQLInputObjectType({
  name: "UpdateAuthorizationInput",
  fields: () => ({
    id: {
      type: new GraphQLNonNull(GraphQLID),
    },
    enabled: {
      type: GraphQLBoolean,
    },
  }),
});
