import {
  GraphQLID,
  GraphQLNonNull,
  GraphQLBoolean,
  GraphQLInputObjectType
} from "graphql";

export const GraphQLCreateOpenIdCredentialInput = new GraphQLInputObjectType({
  name: "CreateOpenIdCredentialInput",
  fields: () => ({
    id: {
      type: new GraphQLNonNull(GraphQLID)
    },
    enabled: {
      type: GraphQLBoolean
    }
  })
});
