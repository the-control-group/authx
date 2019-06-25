import v4 from "uuid/v4";
import { isSuperset } from "@authx/scopes";
import {
  GraphQLID,
  GraphQLBoolean,
  GraphQLFieldConfig,
  GraphQLList,
  GraphQLNonNull,
  GraphQLString
} from "graphql";

import { Context } from "../../Context";
import { GraphQLRole } from "../GraphQLRole";
import { Role } from "../../model";
import { ForbiddenError } from "../../errors";

export const updateRole: GraphQLFieldConfig<
  any,
  {
    id: string;
    enabled: boolean;
    name: null | string;
    description: null | string;
    scopes: null | string[];
    assignUserIds: null | string[];
    unassignUserIds: null | string[];
  },
  Context
> = {
  type: GraphQLRole,
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
    description: {
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
  async resolve(source, args, context): Promise<Role> {
    const { pool, authorization: a, realm } = context;

    if (!a) {
      throw new ForbiddenError("You must be authenticated to update a role.");
    }

    const tx = await pool.connect();
    try {
      await tx.query("BEGIN DEFERRABLE");
      const before = await Role.read(tx, args.id);

      // write.basic -----------------------------------------------------------
      if (!(await before.isAccessibleBy(realm, a, tx, "write.basic"))) {
        throw new ForbiddenError(
          "You do not have permission to update this role."
        );
      }

      // write.scopes ----------------------------------------------------------
      if (
        args.scopes &&
        !(await before.isAccessibleBy(realm, a, tx, "write.scopes"))
      ) {
        throw new ForbiddenError(
          "You do not have permission to update this role's scopes."
        );
      }

      if (
        args.scopes &&
        !(await a.can(tx, `${realm}:role.*.*:write.scopes`)) &&
        !isSuperset(await (await a.user(tx)).access(tx), args.scopes)
      ) {
        throw new ForbiddenError(
          "You do not have permission to set scopes greater than your level of access."
        );
      }

      // write.assignments -----------------------------------------------------
      if (!(await before.isAccessibleBy(realm, a, tx, "write.assignments"))) {
        throw new ForbiddenError(
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
          description: args.description || before.description,
          scopes: args.scopes || before.scopes,
          userIds
        },
        {
          recordId: v4(),
          createdByAuthorizationId: a.id,
          createdAt: new Date()
        }
      );
      await tx.query("COMMIT");
      return role;
    } catch (error) {
      await tx.query("ROLLBACK");
      throw error;
    } finally {
      tx.release();
    }
  }
};
