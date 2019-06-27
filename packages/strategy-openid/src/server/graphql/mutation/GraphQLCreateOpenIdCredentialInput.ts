import {
  GraphQLID,
  GraphQLNonNull,
  GraphQLString,
  GraphQLBoolean,
  GraphQLInputObjectType
} from "graphql";

export const GraphQLCreateOpenIdCredentialInput = new GraphQLInputObjectType({
  name: "CreateOpenIdCredentialInput",
  fields: () => ({
    id: {
      type: GraphQLID,
      description: "Optional UUID to use for the new credential."
    },
    enabled: {
      type: new GraphQLNonNull(GraphQLBoolean)
    },
    userId: {
      type: new GraphQLNonNull(GraphQLID),
      description: "The ID of the AuthX user who will own this credential."
    },
    authorityId: {
      type: new GraphQLNonNull(GraphQLID),
      description:
        "The ID of the AuthX openid authority that can verify this credential."
    },
    code: {
      type: GraphQLString,
      description:
        "The OAuth authorization code provided by the OpenID exchange."
    },
    subject: {
      type: GraphQLString,
      description:
        "The subject according to ID tokens signed by the OpenID provider."
    }
  })
});
