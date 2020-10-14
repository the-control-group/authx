import {
  GraphQLID,
  GraphQLNonNull,
  GraphQLString,
  GraphQLBoolean,
  GraphQLInputObjectType,
  GraphQLList,
} from "graphql";

import { GraphQLUserType } from "../GraphQLUserType";
import { GraphQLAdministrationInput } from "../GraphQLAdministrationInput";

export const GraphQLCreateUserInput = new GraphQLInputObjectType({
  name: "CreateUserInput",
  fields: () => ({
    id: {
      type: GraphQLID,
      description: "Optional UUID to use for the new user.",
    },
    enabled: {
      type: GraphQLBoolean,
      defaultValue: true,
    },
    type: {
      type: new GraphQLNonNull(GraphQLUserType),
    },
    name: {
      type: new GraphQLNonNull(GraphQLString),
    },
    administration: {
      type: new GraphQLList(new GraphQLNonNull(GraphQLAdministrationInput)),
      description:
        "An optional list of roles to which scopes will be added for the purpose of administering the created user.",
      defaultValue: [],
    },
  }),
});
