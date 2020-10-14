import {
  GraphQLID,
  GraphQLNonNull,
  GraphQLString,
  GraphQLBoolean,
  GraphQLInputObjectType,
  GraphQLList,
} from "graphql";

import { GraphQLAdministrationInput } from "@authx/authx";

export const GraphQLCreatePasswordCredentialInput = new GraphQLInputObjectType({
  name: "CreatePasswordCredentialInput",
  fields: () => ({
    id: {
      type: GraphQLID,
      description: "Optional UUID to use for the new credential.",
    },
    enabled: {
      type: new GraphQLNonNull(GraphQLBoolean),
    },
    authorityId: {
      type: new GraphQLNonNull(GraphQLID),
    },
    userId: {
      type: new GraphQLNonNull(GraphQLID),
    },
    password: {
      type: new GraphQLNonNull(GraphQLString),
      description: "The plaintext password to use for this credential.",
    },
    administration: {
      type: new GraphQLList(new GraphQLNonNull(GraphQLAdministrationInput)),
      description:
        "An optional list of roles to which scopes will be added for the purpose of administering the created credential.",
      defaultValue: [],
    },
  }),
});
