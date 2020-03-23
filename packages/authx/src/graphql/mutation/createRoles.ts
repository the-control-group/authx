import { v4 } from "uuid";
import { isSuperset, simplify } from "@authx/scopes";
import { GraphQLFieldConfig, GraphQLList, GraphQLNonNull } from "graphql";
import { Context } from "../../Context";
import { GraphQLRole } from "../GraphQLRole";
import { Role } from "../../model";
import { DataLoaderExecutor } from "../../loader";
import { validateIdFormat } from "../../util/validateIdFormat";
import { createV2AuthXScope } from "../../util/scopes";
import {
  ForbiddenError,
  ConflictError,
  NotFoundError,
  ValidationError
} from "../../errors";
import { GraphQLCreateRoleInput } from "./GraphQLCreateRoleInput";

export const createRoles: GraphQLFieldConfig<
  any,
  Context,
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
  }
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

      const tx = await pool.connect();
      try {
        // Make sure this transaction is used for queries made by the executor.
        const executor = new DataLoaderExecutor(tx);

        if (
          !(await a.can(
            executor,
            createV2AuthXScope(
              realm,
              {
                type: "role",
                roleId: ""
              },
              {
                basic: "*",
                scopes: "*",
                users: "*"
              }
            )
          ))
        ) {
          throw new ForbiddenError(
            "You do not have permission to create roles."
          );
        }

        try {
          await tx.query("BEGIN DEFERRABLE");

          // Make sure the ID isn't already in use.
          if (input.id) {
            try {
              await Role.read(executor, input.id, { forUpdate: true });
              throw new ConflictError();
            } catch (error) {
              if (!(error instanceof NotFoundError)) {
                throw error;
              }
            }
          }

          const id = input.id || v4();

          const roleScopeContext = {
            type: "role" as "role",
            roleId: id
          };

          const possibleAdministrationScopes = [
            createV2AuthXScope(realm, roleScopeContext, {
              basic: "r",
              scopes: "",
              users: ""
            }),
            createV2AuthXScope(realm, roleScopeContext, {
              basic: "r",
              scopes: "r",
              users: ""
            }),
            createV2AuthXScope(realm, roleScopeContext, {
              basic: "r",
              scopes: "",
              users: "r"
            }),
            createV2AuthXScope(realm, roleScopeContext, {
              basic: "r",
              scopes: "*",
              users: "*"
            }),
            createV2AuthXScope(realm, roleScopeContext, {
              basic: "w",
              scopes: "",
              users: ""
            }),
            createV2AuthXScope(realm, roleScopeContext, {
              basic: "w",
              scopes: "w",
              users: ""
            }),
            createV2AuthXScope(realm, roleScopeContext, {
              basic: "w",
              scopes: "",
              users: "w"
            }),
            createV2AuthXScope(realm, roleScopeContext, {
              basic: "w",
              scopes: "*",
              users: "*"
            }),
            createV2AuthXScope(realm, roleScopeContext, {
              basic: "*",
              scopes: "*",
              users: "*"
            })
          ];

          let selfAdministrationScopes: string[] = [];

          // Add administration scopes.
          for (const { roleId, scopes } of input.administration) {
            // The role designates itself for administration.
            if (roleId === id) {
              selfAdministrationScopes = [
                ...selfAdministrationScopes,
                ...possibleAdministrationScopes.filter(possible =>
                  isSuperset(scopes, possible)
                )
              ];
              continue;
            }

            // Make sure we have permission to add scopes to the role.
            const role = await Role.read(executor, roleId, { forUpdate: true });

            if (
              !role.isAccessibleBy(realm, a, executor, {
                basic: "w",
                scopes: "w",
                users: ""
              })
            ) {
              throw new ForbiddenError(
                `You do not have permission to modify the scopes of role ${roleId}.`
              );
            }

            // Update the role.
            await Role.write(
              executor,
              {
                ...role,
                scopes: simplify([
                  ...role.scopes,
                  ...possibleAdministrationScopes.filter(possible =>
                    isSuperset(scopes, possible)
                  )
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
            executor,
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

          // Update the context to use a new executor primed with the results of
          // this mutation, using the original connection pool.
          context.executor = new DataLoaderExecutor(pool, executor.context);

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
