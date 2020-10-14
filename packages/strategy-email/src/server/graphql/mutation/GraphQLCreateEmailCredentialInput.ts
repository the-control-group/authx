import {
  GraphQLID,
  GraphQLNonNull,
  GraphQLString,
  GraphQLBoolean,
  GraphQLInputObjectType,
  GraphQLList,
} from "graphql";

import { GraphQLAdministrationInput } from "@authx/authx";

export const GraphQLCreateEmailCredentialInput = new GraphQLInputObjectType({
  name: "CreateEmailCredentialInput",
  fields: () => ({
    id: {
      type: GraphQLID,
      description: "Optional UUID to use for the new credential.",
    },
    enabled: {
      type: new GraphQLNonNull(GraphQLBoolean),
    },
    userId: {
      type: new GraphQLNonNull(GraphQLID),
      description: "The ID of the AuthX user who will own this credential.",
    },
    authorityId: {
      type: new GraphQLNonNull(GraphQLID),
      description:
        "The ID of the AuthX email authority that can verify this credential.",
    },
    email: {
      type: new GraphQLNonNull(GraphQLID),
      description: "The email address of the user.",
    },
    proof: {
      type: GraphQLString,
      description:
        "This is a unique code that was sent by the authority to prove control of the email address.",
    },
    administration: {
      type: new GraphQLList(new GraphQLNonNull(GraphQLAdministrationInput)),
      description:
        "An optional list of roles to which scopes will be added for the purpose of administering the created credential.",
      defaultValue: [],
    },
  }),
});
