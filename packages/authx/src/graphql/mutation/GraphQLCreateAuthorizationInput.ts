import {
  GraphQLID,
  GraphQLList,
  GraphQLNonNull,
  GraphQLBoolean,
  GraphQLInputObjectType,
} from "graphql";

import { GraphQLAdministrationInput } from "../GraphQLAdministrationInput";
import { GraphQLScope } from "../GraphQLScope";

export const GraphQLCreateAuthorizationInput = new GraphQLInputObjectType({
  name: "CreateAuthorizationInput",
  fields: () => ({
    id: {
      type: GraphQLID,
      description: "Optional UUID to use for the new authorization.",
    },
    enabled: {
      type: GraphQLBoolean,
      defaultValue: true,
    },
    userId: {
      type: new GraphQLNonNull(GraphQLID),
    },
    grantId: {
      type: GraphQLID,
    },
    scopes: {
      type: new GraphQLNonNull(
        new GraphQLList(new GraphQLNonNull(GraphQLScope))
      ),
    },
    administration: {
      type: new GraphQLList(new GraphQLNonNull(GraphQLAdministrationInput)),
      description:
        "An optional list of roles to which scopes will be added for the purpose of administering the created authorization.",
      defaultValue: [],
    },
  }),
});
