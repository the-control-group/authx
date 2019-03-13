import {
  GraphQLID,
  GraphQLList,
  GraphQLNonNull,
  GraphQLString,
  GraphQLObjectType
} from "graphql";

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
    oauthRefreshToken: { type: GraphQLString },
    scopes: { type: new GraphQLList(GraphQLString) }
  })
});
