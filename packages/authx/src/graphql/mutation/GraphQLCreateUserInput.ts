import {
  GraphQLID,
  GraphQLNonNull,
  GraphQLString,
  GraphQLBoolean,
  GraphQLInputObjectType
} from "graphql";

import { GraphQLUserType } from "../GraphQLUserType";

export const GraphQLCreateUserInput = new GraphQLInputObjectType({
  name: "CreateUserInput",
  fields: () => ({
    id: {
      type: GraphQLID,
      description: "Optional UUID to use for the new user."
    },
    enabled: {
      type: GraphQLBoolean,
      defaultValue: true
    },
    type: {
      type: new GraphQLNonNull(GraphQLUserType)
    },
    name: {
      type: new GraphQLNonNull(GraphQLString)
    }
  })
});
