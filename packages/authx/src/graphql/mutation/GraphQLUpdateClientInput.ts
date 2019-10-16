import {
  GraphQLID,
  GraphQLList,
  GraphQLNonNull,
  GraphQLString,
  GraphQLBoolean,
  GraphQLInputObjectType,
  GraphQLInt
} from "graphql";

export const GraphQLUpdateClientInput = new GraphQLInputObjectType({
  name: "UpdateClientInput",
  fields: () => ({
    id: {
      type: new GraphQLNonNull(GraphQLID)
    },
    enabled: {
      type: GraphQLBoolean
    },
    name: {
      type: GraphQLString
    },
    description: {
      type: GraphQLString
    },
    addUrls: {
      type: new GraphQLList(new GraphQLNonNull(GraphQLString))
    },
    removeUrls: {
      type: new GraphQLList(new GraphQLNonNull(GraphQLString))
    },
    generateSecrets: {
      type: GraphQLInt
    },
    removeSecrets: {
      type: new GraphQLList(new GraphQLNonNull(GraphQLString))
    }
  })
});
