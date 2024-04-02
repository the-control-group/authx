import {
  GraphQLID,
  GraphQLList,
  GraphQLNonNull,
  GraphQLString,
  GraphQLBoolean,
  GraphQLInputObjectType,
} from "graphql";

import { GraphQLAdministrationInput } from "../GraphQLAdministrationInput.js";
import { GraphQLScopeTemplate } from "../GraphQLScopeTemplate.js";

export const GraphQLCreateRoleInput = new GraphQLInputObjectType({
  name: "CreateRoleInput",
  fields: () => ({
    id: {
      type: GraphQLID,
      description: "Optional UUID to use for the new role.",
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
    scopes: {
      type: new GraphQLNonNull(
        new GraphQLList(new GraphQLNonNull(GraphQLScopeTemplate)),
      ),
    },
    userIds: {
      type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(GraphQLID))),
    },
    administration: {
      type: new GraphQLList(new GraphQLNonNull(GraphQLAdministrationInput)),
      description:
        "An optional list of roles to which scopes will be added for the purpose of administering the created role.",
      defaultValue: [],
    },
  }),
});
