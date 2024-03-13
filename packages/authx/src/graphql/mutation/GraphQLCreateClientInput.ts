import {
  GraphQLID,
  GraphQLList,
  GraphQLNonNull,
  GraphQLString,
  GraphQLBoolean,
  GraphQLInputObjectType,
} from "graphql";

import { GraphQLAdministrationInput } from "../GraphQLAdministrationInput.js";

export const GraphQLCreateClientInput = new GraphQLInputObjectType({
  name: "CreateClientInput",
  fields: () => ({
    id: {
      type: GraphQLID,
      description: "Optional UUID to use for the new client.",
    },
    enabled: {
      type: GraphQLBoolean,
      defaultValue: true,
    },
    name: {
      type: new GraphQLNonNull(GraphQLString),
    },
    description: {
      type: new GraphQLNonNull(GraphQLString),
    },
    urls: {
      type: new GraphQLNonNull(
        new GraphQLList(new GraphQLNonNull(GraphQLString)),
      ),
    },
    administration: {
      type: new GraphQLList(new GraphQLNonNull(GraphQLAdministrationInput)),
      description:
        "An optional list of roles to which scopes will be added for the purpose of administering the created cliet.",
      defaultValue: [],
    },
  }),
});
