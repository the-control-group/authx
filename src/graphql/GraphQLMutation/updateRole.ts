import v4 from "uuid/v4";
import { isSuperset, isStrictSuperset } from "scopeutils";
import {
  GraphQLBoolean,
  GraphQLFieldConfig,
  GraphQLList,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLString
} from "graphql";

import { Context } from "../Context";
import { GraphQLRole } from "../GraphQLRole";
import { Role } from "../../models";

export const GraphQLUpdateRoleResult = new GraphQLObjectType({
  name: "UpdateRoleResult",
  fields: () => ({
    success: { type: new GraphQLNonNull(GraphQLBoolean) },
    message: { type: GraphQLString },
    role: { type: GraphQLRole }
  })
});

export const updateRole: GraphQLFieldConfig<
  any,
  {
    id: string;
    enabled: null | boolean;
    name: null | string;
    scopes: null | string[];
    assignUserIds: null | string[];
    unassignUserIds: null | string[];
  },
  Context
> = {
  type: GraphQLUpdateRoleResult,
  description: "Update a new role.",
  args: {
    id: {
      type: new GraphQLNonNull(GraphQLID)
    },
    enabled: {
      type: GraphQLBoolean,
      defaultValue: true
    },
    name: {
      type: GraphQLString
    },
    scopes: {
      type: new GraphQLList(new GraphQLNonNull(GraphQLString))
    },
    assignUserIds: {
      type: new GraphQLList(new GraphQLNonNull(GraphQLString))
    },
    unassignUserIds: {
      type: new GraphQLList(new GraphQLNonNull(GraphQLString))
    }
  },
  async resolve(source, args, context) {
    const { tx, token: t, realm } = context;

    if (!t) {
      return {
        success: false,
        message: "You must be authenticated to update a role.",
        role: null
      };
    }

    await tx.query("BEGIN DEFERRABLE");

    try {
      const before = await Role.read(tx, args.id);

      if (
        // can update any roles
        !(await t.can(tx, `${realm}:role.*.*:write.basic`)) &&
        // can update roles with equal access
        !(
          (await t.can(tx, `${realm}:role.equal.*:write.basic`)) &&
          isSuperset(await (await t.user(tx)).access(tx), before.scopes)
        ) &&
        // can update roles with lesser access
        !(
          (await t.can(tx, `${realm}:role.equal.lesser:write.basic`)) &&
          isStrictSuperset(await (await t.user(tx)).access(tx), before.scopes)
        )
      ) {
        throw new Error("You do not have permission to update this role.");
      }

      if (
        args.scopes &&
        // can update any roles
        !(await t.can(tx, `${realm}:role.*.*:write.scopes`)) &&
        // can update roles with equal access
        !(
          (await t.can(tx, `${realm}:role.equal.*:write.scopes`)) &&
          isSuperset(await (await t.user(tx)).access(tx), before.scopes)
        ) &&
        // can update roles with lesser access
        !(
          (await t.can(tx, `${realm}:role.equal.lesser:write.scopes`)) &&
          isStrictSuperset(await (await t.user(tx)).access(tx), before.scopes)
        )
      ) {
        throw new Error(
          "You do not have permission to update this role's scopes."
        );
      }

      if (
        args.scopes &&
        !(await t.can(tx, `${realm}:role.*.*:write.scopes`)) &&
        !isSuperset(await (await t.user(tx)).access(tx), args.scopes)
      ) {
        throw new Error(
          "You do not have permission to set scopes greater than your level of access."
        );
      }

      if (
        (args.assignUserIds || args.unassignUserIds) &&
        // can update any roles
        !(await t.can(tx, `${realm}:role.*.*:write.assignments`)) &&
        // can update roles with equal access
        !(
          (await t.can(tx, `${realm}:role.equal.*:write.assignments`)) &&
          isSuperset(await (await t.user(tx)).access(tx), before.scopes)
        ) &&
        // can update roles with lesser access
        !(
          (await t.can(tx, `${realm}:role.equal.lesser:write.assignments`)) &&
          isStrictSuperset(await (await t.user(tx)).access(tx), before.scopes)
        )
      ) {
        throw new Error(
          "You do not have permission to update this role's assignments."
        );
      }

      let userIds = [...before.userIds];

      // assign users
      if (args.assignUserIds) {
        userIds = [...userIds, ...args.assignUserIds];
      }

      // unassign users
      if (args.unassignUserIds) {
        const unassignUserIds = new Set(args.unassignUserIds);
        userIds = userIds.filter(id => !unassignUserIds.has(id));
      }

      const role = await Role.write(
        tx,
        {
          ...before,
          enabled:
            typeof args.enabled === "boolean" ? args.enabled : before.enabled,
          name: args.name || before.name,
          scopes: args.scopes || before.scopes,
          userIds
        },
        {
          recordId: v4(),
          createdByTokenId: t.id,
          createdAt: new Date()
        }
      );

      await tx.query("COMMIT");
      return {
        success: true,
        message: null,
        role
      };
    } catch (error) {
      console.error(error);
      await tx.query("ROLLBACK");
      return {
        success: false,
        message: error.message,
        token: null
      };
    }
  }
};
