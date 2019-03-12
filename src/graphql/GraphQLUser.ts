import {
  GraphQLFloat,
  GraphQLID,
  GraphQLInt,
  GraphQLString,
  GraphQLList,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLEnumType
} from "graphql";

import { PoolClient } from "pg";

import { GraphQLProfile } from "./GraphQLProfile";
import { GraphQLCredential } from "./GraphQLCredential";
import { GraphQLRole } from "./GraphQLRole";
import { GraphQLUserType } from "./GraphQLUserType";

export const GraphQLUser: GraphQLObjectType = new GraphQLObjectType({
  name: "User",
  interfaces: () => [],
  fields: () => ({
    id: { type: new GraphQLNonNull(GraphQLID) },
    type: { type: GraphQLString },
    profile: { type: GraphQLProfile },
    credentials: {
      type: new GraphQLList(GraphQLCredential),
      resolve(user, args, context: { tx: PoolClient }, info) {
        return user.credentials(context.tx);
      }
    },
    roles: {
      type: new GraphQLList(GraphQLRole),
      resolve(user, args, context: { tx: PoolClient }, info) {
        return user.roles(context.tx);
      }
    }
  })
});
