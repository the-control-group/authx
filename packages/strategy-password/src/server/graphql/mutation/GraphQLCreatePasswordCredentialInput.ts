import {
  GraphQLID,
  GraphQLNonNull,
  GraphQLString,
  GraphQLBoolean,
  GraphQLInputObjectType
} from "graphql";

export const GraphQLCreatePasswordCredentialInput = new GraphQLInputObjectType({
  name: "CreatePasswordCredentialInput",
  fields: () => ({
    id: {
      type: GraphQLID,
      description: "Optional UUID to use for the new credential."
    },
    enabled: {
      type: new GraphQLNonNull(GraphQLBoolean)
    },
    authorityId: {
      type: new GraphQLNonNull(GraphQLID)
    },
    userId: {
      type: new GraphQLNonNull(GraphQLID)
    },
    password: {
      type: new GraphQLNonNull(GraphQLString),
      description: "The plaintext password to use for this credential."
    }
  })
});
