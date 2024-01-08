import {
  GraphQLID,
  GraphQLList,
  GraphQLNonNull,
  GraphQLString,
  GraphQLBoolean,
  GraphQLInputObjectType,
  GraphQLInt,
} from "graphql";

import { GraphQLScope } from "../GraphQLScope.js";

export const GraphQLUpdateGrantInput = new GraphQLInputObjectType({
  name: "UpdateGrantInput",
  fields: () => ({
    id: {
      type: new GraphQLNonNull(GraphQLID),
    },
    enabled: {
      type: GraphQLBoolean,
    },
    scopes: {
      type: new GraphQLList(new GraphQLNonNull(GraphQLScope)),
    },
    generateSecrets: {
      type: GraphQLInt,
    },
    removeSecrets: {
      type: new GraphQLList(new GraphQLNonNull(GraphQLString)),
    },
    generateCodes: {
      type: GraphQLInt,
    },
    removeCodes: {
      type: new GraphQLList(new GraphQLNonNull(GraphQLString)),
    },
  }),
});
