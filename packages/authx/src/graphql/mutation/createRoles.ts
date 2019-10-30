import v4 from "uuid/v4";
import { getIntersection, simplify } from "@authx/scopes";
import { GraphQLFieldConfig, GraphQLList, GraphQLNonNull } from "graphql";
import { Context } from "../../Context";
import { GraphQLRole } from "../GraphQLRole";
import { Role } from "../../model";
import { makeAdministrationScopes } from "../../util/makeAdministrationScopes";
import { validateIdFormat } from "../../util/validateIdFormat";
import {
  ForbiddenError,
  ConflictError,
  NotFoundError,
  ValidationError
} from "../../errors";
import { GraphQLCreateRoleInput } from "./GraphQLCreateRoleInput";

export const createRoles: GraphQLFieldConfig<
  any,
  {
    roles: {
      id: null | string;
      enabled: boolean;
      name: string;
      description: string;
      scopes: string[];
      userIds: string[];
      administration: {
        roleId: string;
        scopes: string[];
      }[];
    }[];
  },
  Context
> = {
  type: new GraphQLList(GraphQLRole),
  description: "Create a new role.",
  args: {
    roles: {
      type: new GraphQLNonNull(
        new GraphQLList(new GraphQLNonNull(GraphQLCreateRoleInput))
      )
    }
  },
  async resolve(source, args, context): Promise<Promise<Role>[]> {
    const { pool, authorization: a, realm } = context;

    if (!a) {
      throw new ForbiddenError("You must be authenticated to create a role.");
    }

    return args.roles.map(async input => {
      // Validate `id`.
      if (typeof input.id === "string" && !validateIdFormat(input.id)) {
        throw new ValidationError("The provided `id` is an invalid ID.");
      }

      // Validate `userIds`.
      for (const userId of input.userIds) {
        if (!validateIdFormat(userId)) {
          throw new ValidationError(
            "The provided `userIds` list contains an invalid ID."
          );
        }
      }

      // Validate `administration`.
      for (const { roleId } of input.administration) {
        if (!validateIdFormat(roleId)) {
          throw new ValidationError(
            "The provided `administration` list contains a `roleId` that is an invalid ID."
          );
        }
      }

      /* eslint-disable @typescript-eslint/camelcase */
      const values: { [name: string]: null | string } = {
        current_authorization_id: a.id,
        current_user_id: a.userId,
        ...(a.grantId ? { current_grant_id: a.grantId } : null)
      };
      /* eslint-enable @typescript-eslint/camelcase */

      const tx = await pool.connect();
      try {
        if (!(await a.can(tx, values, `${realm}:role.......:*..*..*`))) {
          throw new ForbiddenError(
            "You do not have permission to create roles."
          );
        }

        try {
          await tx.query("BEGIN DEFERRABLE");

          // Make sure the ID isn't already in use.
          if (input.id) {
            try {
              await Role.read(tx, input.id, { forUpdate: true });
              throw new ConflictError();
            } catch (error) {
              if (!(error instanceof NotFoundError)) {
                throw error;
              }
            }
          }

          const id = input.id || v4();

          const possibleAdministrationScopes = makeAdministrationScopes(
            await a.access(tx, values),
            realm,
            "role",
            id,
            ["r....", "r..r..", "r....r", "w....", "w..w..", "w....w"]
          );

          let selfAdministrationScopes: string[] = [];

          // Add administration scopes.
          for (const { roleId, scopes } of input.administration) {
            // The role designates itself for administration.
            if (roleId === id) {
              selfAdministrationScopes = [
                ...selfAdministrationScopes,
                ...getIntersection(possibleAdministrationScopes, scopes)
              ];
              continue;
            }

            // Make sure we have permission to add scopes to the role.
            const role = await Role.read(tx, roleId, { forUpdate: true });

            if (!role.isAccessibleBy(realm, a, tx, "w..w..")) {
              throw new ForbiddenError(
                `You do not have permission to modify the scopes of role ${roleId}.`
              );
            }

            // Update the role.
            await Role.write(
              tx,
              {
                ...role,
                scopes: simplify([
                  ...role.scopes,
                  ...getIntersection(possibleAdministrationScopes, scopes)
                ])
              },
              {
                recordId: v4(),
                createdByAuthorizationId: a.id,
                createdAt: new Date()
              }
            );
          }

          const role = await Role.write(
            tx,
            {
              id,
              enabled: input.enabled,
              name: input.name,
              description: input.description,
              scopes: simplify([...input.scopes, ...selfAdministrationScopes]),
              userIds: input.userIds
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
        }
      } finally {
        tx.release();
      }
    });
  }
};
