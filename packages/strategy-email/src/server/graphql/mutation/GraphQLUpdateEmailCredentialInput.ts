import {
  GraphQLID,
  GraphQLNonNull,
  GraphQLBoolean,
  GraphQLInputObjectType,
} from "graphql";

export const GraphQLUpdateEmailCredentialInput = new GraphQLInputObjectType({
  name: "UpdateEmailCredentialInput",
  fields: () => ({
    id: {
      type: new GraphQLNonNull(GraphQLID),
    },
    enabled: {
      type: GraphQLBoolean,
    },
  }),
});
