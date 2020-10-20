import {
  GraphQLBoolean,
  GraphQLID,
  GraphQLInputObjectType,
  GraphQLNonNull,
} from "graphql";

export const GraphQLUpdateSamlCredentialInput = new GraphQLInputObjectType({
  name: "UpdateSamlCredentialInput",
  fields: () => ({
    id: {
      type: new GraphQLNonNull(GraphQLID),
    },
    enabled: {
      type: GraphQLBoolean,
    },
  }),
});
