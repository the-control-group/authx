import {
  GraphQLID,
  GraphQLList,
  GraphQLNonNull,
  GraphQLString,
  GraphQLBoolean,
  GraphQLInputObjectType
} from "graphql";

import { GraphQLAdministrationInput } from "../GraphQLAdministrationInput";

export const GraphQLCreateAuthorizationInput = new GraphQLInputObjectType({
  name: "CreateAuthorizationInput",
  fields: () => ({
    id: {
      type: GraphQLID,
      description: "Optional UUID to use for the new authorization."
    },
    enabled: {
      type: GraphQLBoolean,
      defaultValue: true
    },
    userId: {
      type: new GraphQLNonNull(GraphQLID)
    },
    grantId: {
      type: new GraphQLNonNull(GraphQLID)
    },
    scopes: {
      type: new GraphQLNonNull(
        new GraphQLList(new GraphQLNonNull(GraphQLString))
      )
    },
    administration: {
      type: new GraphQLList(new GraphQLNonNull(GraphQLAdministrationInput)),
      description:
        "An optional list of roles to which scopes will be added for the purpose of administering the created authorization.",
      defaultValue: []
    }
  })
});
