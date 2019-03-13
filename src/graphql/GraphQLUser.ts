import {
  GraphQLID,
  GraphQLList,
  GraphQLNonNull,
  GraphQLObjectType
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
    type: { type: GraphQLUserType },
    profile: { type: GraphQLProfile },
    credentials: {
      type: new GraphQLList(GraphQLCredential),
      resolve(user, args, context: { tx: PoolClient }) {
        return user.credentials(context.tx);
      }
    },
    roles: {
      type: new GraphQLList(GraphQLRole),
      resolve(user, args, context: { tx: PoolClient }) {
        return user.roles(context.tx);
      }
    }
  })
});
