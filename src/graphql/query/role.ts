import { GraphQLFieldConfig, GraphQLID, GraphQLNonNull } from "graphql";
import { Context } from "../Context";
import { GraphQLRole } from "../GraphQLRole";
import { Role } from "../../models";

import { isSuperset, isStrictSuperset } from "scopeutils";

export const role: GraphQLFieldConfig<
  any,
  {
    id: string;
  },
  Context
> = {
  type: GraphQLRole,
  description: "Fetch a role by ID.",
  args: {
    id: {
      type: new GraphQLNonNull(GraphQLID)
    }
  },
  async resolve(source, args, context) {
    const { tx, token: t, realm } = context;

    // can view the roles of all users
    if (t && (await t.can(tx, `${realm}:role.*.*:read.basic`))) {
      return Role.read(tx, args.id);
    }

    // can view the roles of users with lesser or equal access
    if (t && (await t.can(tx, `${realm}:role.equal.*:read.basic`))) {
      const [role, user] = await Promise.all([
        Role.read(tx, args.id),
        await t.user(tx)
      ]);

      // assigned roles are always equal
      if (role.userIds.has(user.id)) {
        return role;
      }

      // superset or equal
      if (isSuperset(await user.access(tx), await role.access())) {
        return role;
      }

      return null;
    }

    // can view the roles of users with lesser access
    if (t && (await t.can(tx, `${realm}:role.equal.lesser:read.basic`))) {
      const [role, user] = await Promise.all([
        Role.read(tx, args.id),
        await t.user(tx)
      ]);

      // check if it's possible to access assigned roles
      if (
        role.userIds.has(user.id) &&
        (await t.can(tx, `${realm}:role.equal.assigned:read.basic`))
      ) {
        return role;
      }

      // strict superset
      if (isStrictSuperset(await user.access(tx), role.access())) {
        return role;
      }

      return null;
    }

    // can view own roles
    if (t && (await t.can(tx, `${realm}:role.equal.assigned:read.basic`))) {
      const [role, user] = await Promise.all([
        Role.read(tx, args.id),
        t.user(tx)
      ]);

      if (role.userIds.has(user.id)) {
        return role;
      }
    }

    return null;
  }
};
