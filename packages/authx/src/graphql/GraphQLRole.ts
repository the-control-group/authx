import {
  GraphQLID,
  GraphQLList,
  GraphQLNonNull,
  GraphQLString,
  GraphQLObjectType
} from "graphql";

import { Role } from "../model";
import { Context } from "../Context";
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
      async resolve(role, args, { realm, authorization: a, tx }: Context) {
        return a &&
          (await role.isAccessibleBy(realm, a, tx, "read.assignments"))
          ? filter(await role.users(tx), user =>
              user.isAccessibleBy(realm, a, tx)
            )
          : [];
      }
    },
    scopes: {
      type: new GraphQLList(GraphQLString),
      async resolve(
        role,
        args,
        { realm, authorization: a, tx }: Context
      ): Promise<null | string[]> {
        return a && (await role.isAccessibleBy(realm, a, tx, "read.scopes"))
          ? role.scopes
          : null;
      }
    }
  })
});
