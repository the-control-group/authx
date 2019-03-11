import {
  GraphQLFloat,
  GraphQLID,
  GraphQLInt,
  GraphQLList,
  GraphQLNonNull,
  GraphQLString,
  GraphQLObjectType
} from "graphql";

import GraphQLJSON from "graphql-type-json";
import { GraphQLClient } from "./GraphQLClient";
import { GraphQLUser } from "./GraphQLUser";

export const GraphQLGrant = new GraphQLObjectType({
  name: "Grant",
  interfaces: () => [],
  fields: () => ({
    id: { type: new GraphQLNonNull(GraphQLID) },
    user: { type: GraphQLUser },
    client: { type: GraphQLClient },
    nonce: { type: GraphQLString },
    refreshToken: { type: GraphQLString },
    scopes: { type: new GraphQLList(GraphQLString) }
  })
});
