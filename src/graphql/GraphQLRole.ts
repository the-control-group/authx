import {
  GraphQLID,
  GraphQLList,
  GraphQLNonNull,
  GraphQLString,
  GraphQLObjectType
} from "graphql";

import { Role } from "../models";
import { Context } from "./Context";
import { GraphQLUser } from "./GraphQLUser";
import { filter } from "../util/filter";

export const GraphQLRole = new GraphQLObjectType<Role, Context>({
  name: "Role",
  interfaces: () => [],
  fields: () => ({
    id: { type: new GraphQLNonNull(GraphQLID) },
    name: { type: GraphQLString },
    users: {
      type: new GraphQLList(GraphQLUser),
      async resolve(role, args, { realm, token: t, tx }: Context) {
        return t
          ? filter(await role.users(tx), user =>
              user.isAccessibleBy(realm, t, tx)
            )
          : [];
      }
    },
    scopes: {
      type: new GraphQLList(GraphQLString),
      async resolve(
        role,
        args,
        { realm, token: t, tx }: Context
      ): Promise<null | string[]> {
        return t && (await role.isAccessibleBy(realm, t, tx, "read.scopes"))
          ? role.scopes
          : null;
      }
    }
  })
});
