import {
  GraphQLID,
  GraphQLNonNull,
  GraphQLInt,
  GraphQLString,
  GraphQLBoolean,
  GraphQLInputObjectType,
  GraphQLList
} from "graphql";

import { GraphQLAdministrationInput } from "@authx/authx";

export const GraphQLCreatePasswordAuthorityInput = new GraphQLInputObjectType({
  name: "CreatePasswordAuthorityInput",
  fields: () => ({
    id: {
      type: GraphQLID,
      description: "Optional UUID to use for the new authority."
    },
    enabled: {
      type: GraphQLBoolean,
      defaultValue: true
    },
    name: {
      type: new GraphQLNonNull(GraphQLString),
      description: "The name of the authority."
    },
    description: {
      type: new GraphQLNonNull(GraphQLString),
      description: "A description of the authority."
    },
    rounds: {
      type: GraphQLInt,
      defaultValue: 10,
      description:
        "The number of bcrypt rounds to use when generating new hashes."
    },
    administration: {
      type: new GraphQLList(new GraphQLNonNull(GraphQLAdministrationInput)),
      description:
        "An optional list of roles to which scopes will be added for the purpose of administering the created authority.",
      defaultValue: []
    }
  })
});
