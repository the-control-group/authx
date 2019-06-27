import v4 from "uuid/v4";
import { isSuperset } from "@authx/scopes";
import { GraphQLFieldConfig, GraphQLList, GraphQLNonNull } from "graphql";

import { Context } from "../../Context";
import { GraphQLRole } from "../GraphQLRole";
import { Role } from "../../model";
import { ForbiddenError } from "../../errors";
import { GraphQLUpdateRoleInput } from "./GraphQLUpdateRoleInput";

export const updateRoles: GraphQLFieldConfig<
  any,
  {
    roles: {
      id: string;
      enabled: boolean;
      name: null | string;
      description: null | string;
      scopes: null | string[];
      assignUserIds: null | string[];
      unassignUserIds: null | string[];
    }[];
  },
  Context
> = {
  type: new GraphQLList(GraphQLRole),
  description: "Update a new role.",
  args: {
    roles: {
      type: new GraphQLNonNull(
        new GraphQLList(new GraphQLNonNull(GraphQLUpdateRoleInput))
      )
    }
  },
  async resolve(source, args, context): Promise<Promise<Role>[]> {
    const { pool, authorization: a, realm } = context;

    if (!a) {
      throw new ForbiddenError("You must be authenticated to update a role.");
    }

    return args.roles.map(async input => {
      const tx = await pool.connect();
      try {
        await tx.query("BEGIN DEFERRABLE");
        const before = await Role.read(tx, input.id, {
          forUpdate: true
        });

        // write.basic -----------------------------------------------------------
        if (!(await before.isAccessibleBy(realm, a, tx, "write.basic"))) {
          throw new ForbiddenError(
            "You do not have permission to update this role."
          );
        }

        // write.scopes ----------------------------------------------------------
        if (
          input.scopes &&
          !(await before.isAccessibleBy(realm, a, tx, "write.scopes"))
        ) {
          throw new ForbiddenError(
            "You do not have permission to update this role's scopes."
          );
        }

        if (
          input.scopes &&
          !(await a.can(tx, `${realm}:role.*.*:write.scopes`)) &&
          !isSuperset(await (await a.user(tx)).access(tx), input.scopes)
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
        if (input.assignUserIds) {
          userIds = [...userIds, ...input.assignUserIds];
        }

        // unassign users
        if (input.unassignUserIds) {
          const unassignUserIds = new Set(input.unassignUserIds);
          userIds = userIds.filter(id => !unassignUserIds.has(id));
        }

        const role = await Role.write(
          tx,
          {
            ...before,
            enabled:
              typeof input.enabled === "boolean"
                ? input.enabled
                : before.enabled,
            name: input.name || before.name,
            description: input.description || before.description,
            scopes: input.scopes || before.scopes,
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
    });
  }
};
