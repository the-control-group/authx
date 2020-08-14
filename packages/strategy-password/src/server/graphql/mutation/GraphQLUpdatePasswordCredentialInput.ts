import {
  GraphQLID,
  GraphQLNonNull,
  GraphQLString,
  GraphQLBoolean,
  GraphQLInputObjectType
} from "graphql";

export const GraphQLUpdatePasswordCredentialInput = new GraphQLInputObjectType({
  name: "UpdatePasswordCredentialInput",
  fields: () => ({
    id: {
      type: new GraphQLNonNull(GraphQLID)
    },
    enabled: {
      type: GraphQLBoolean
    },
    password: {
      type: GraphQLString,
      description: "The plaintext password to use for this credential."
    }
  })
});
