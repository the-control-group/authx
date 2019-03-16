import {
  GraphQLID,
  GraphQLList,
  GraphQLNonNull,
  GraphQLString,
  GraphQLObjectType
} from "graphql";

import { PoolClient } from "pg";
import { GraphQLUser } from "./GraphQLUser";

export const GraphQLClient = new GraphQLObjectType({
  name: "Client",
  interfaces: () => [],
  fields: () => ({
    id: { type: new GraphQLNonNull(GraphQLID) },
    name: { type: GraphQLString },
    oauthSecrets: { type: GraphQLString },
    oauthUrls: { type: new GraphQLList(GraphQLString) },
    users: {
      type: new GraphQLList(GraphQLUser),
      resolve(role, args, context: { tx: PoolClient }) {
        return role.users(context.tx);
      }
    }
  })
});
