import {
  GraphQLNonNull,
  GraphQLInt,
  GraphQLString,
  GraphQLBoolean,
  GraphQLInputObjectType
} from "graphql";

export const GraphQLCreatePasswordAuthorityInput = new GraphQLInputObjectType({
  name: "CreatePasswordAuthorityInput",
  fields: () => ({
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
    }
  })
});
