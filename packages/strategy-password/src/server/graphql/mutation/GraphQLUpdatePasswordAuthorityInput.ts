import {
  GraphQLID,
  GraphQLInt,
  GraphQLNonNull,
  GraphQLString,
  GraphQLBoolean,
  GraphQLInputObjectType,
} from "graphql";

export const GraphQLUpdatePasswordAuthorityInput = new GraphQLInputObjectType({
  name: "UpdatePasswordAuthorityInput",
  fields: () => ({
    id: {
      type: new GraphQLNonNull(GraphQLID),
    },
    enabled: {
      type: GraphQLBoolean,
    },
    name: {
      type: GraphQLString,
      description: "The name of the authority.",
    },
    description: {
      type: GraphQLString,
      description: "The description of the authority.",
    },
    rounds: {
      type: GraphQLInt,
      description:
        "The number of bcrypt rounds to use when generating new hashes.",
    },
  }),
});
