import { v4 } from "uuid";
import { isSuperset } from "@authx/scopes";
import { GraphQLFieldConfig, GraphQLList, GraphQLNonNull } from "graphql";
import { Context } from "../../Context";
import { GraphQLRole } from "../GraphQLRole";
import { Role } from "../../model";
import { filter } from "../../util/filter";
import { validateIdFormat } from "../../util/validateIdFormat";
import { ForbiddenError, ValidationError } from "../../errors";
import { GraphQLUpdateRoleInput } from "./GraphQLUpdateRoleInput";

export const updateRoles: GraphQLFieldConfig<
  any,
  Context,
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
  }
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
      // Validate `id`.
      if (!validateIdFormat(input.id)) {
        throw new ValidationError("The provided `id` is an invalid ID.");
      }

      // Validate `userIds`.
      if (Array.isArray(input.assignUserIds)) {
        for (const userId of input.assignUserIds) {
          if (!validateIdFormat(userId)) {
            throw new ValidationError(
              "The provided `assignUserIds` list contains an invalid ID."
            );
          }
        }
      }

      const tx = await pool.connect();
      try {
        await tx.query("BEGIN DEFERRABLE");
        const before = await Role.read(tx, input.id, {
          forUpdate: true
        });

        // w.... -----------------------------------------------------------
        if (
          !(await before.isAccessibleBy(realm, a, tx, {
            basic: "w",
            scopes: "",
            users: ""
          }))
        ) {
          throw new ForbiddenError(
            "You do not have permission to update this role."
          );
        }

        // w..w.. ----------------------------------------------------------
        if (
          input.scopes &&
          !(await before.isAccessibleBy(realm, a, tx, {
            basic: "w",
            scopes: "w",
            users: ""
          }))
        ) {
          throw new ForbiddenError(
            "You do not have permission to update this role's scopes."
          );
        }

        if (input.scopes) {
          // To add a scope to a role, a user must have the ability to assign
          // users to a role that contains the scope.
          const roleIDs = (
            await tx.query(`
            SELECT entity_id AS id
            FROM authx.role_record
            WHERE
              replacement_record_id IS NULL
              AND enabled = true
            FOR UPDATE
          `)
          ).rows.map(({ id }) => id) as string[];

          const assignableScopes = roleIDs.length
            ? (
                await filter(
                  await Role.read(tx, roleIDs, { forUpdate: true }),
                  role =>
                    role.isAccessibleBy(realm, a, tx, {
                      basic: "w",
                      scopes: "",
                      users: "w"
                    })
                )
              ).reduce<string[]>((acc, { scopes }) => {
                return [...acc, ...scopes];
              }, [])
            : [];

          if (!isSuperset(assignableScopes, input.scopes))
            throw new ForbiddenError(
              "You do not have permission to assign the provided scopes."
            );
        }

        // w....w -----------------------------------------------------
        if (
          !(await before.isAccessibleBy(realm, a, tx, {
            basic: "w",
            scopes: "",
            users: "w"
          }))
        ) {
          throw new ForbiddenError(
            "You do not have permission to update this role's users."
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
