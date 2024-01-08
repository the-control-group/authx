import {
  GraphQLID,
  GraphQLList,
  GraphQLNonNull,
  GraphQLBoolean,
  GraphQLInputObjectType,
} from "graphql";

import { GraphQLAdministrationInput } from "../GraphQLAdministrationInput.js";
import { GraphQLScope } from "../GraphQLScope.js";

export const GraphQLCreateGrantInput = new GraphQLInputObjectType({
  name: "CreateGrantInput",
  fields: () => ({
    id: {
      type: GraphQLID,
      description: "Optional UUID to use for the new grant.",
    },
    enabled: {
      type: GraphQLBoolean,
      defaultValue: true,
    },
    userId: {
      type: new GraphQLNonNull(GraphQLID),
    },
    clientId: {
      type: new GraphQLNonNull(GraphQLID),
    },
    scopes: {
      type: new GraphQLNonNull(
        new GraphQLList(new GraphQLNonNull(GraphQLScope)),
      ),
    },
    administration: {
      type: new GraphQLList(new GraphQLNonNull(GraphQLAdministrationInput)),
      description:
        "An optional list of roles to which scopes will be added for the purpose of administering the created grant.",
      defaultValue: [],
    },
  }),
});
