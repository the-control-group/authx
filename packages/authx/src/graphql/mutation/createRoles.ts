import { v4 } from "uuid";
import { filter } from "../../util/filter.js";
import pg, { Pool, PoolClient } from "pg";
import { isSuperset, simplify } from "@authx/scopes";
import { GraphQLFieldConfig, GraphQLList, GraphQLNonNull } from "graphql";
import { Context } from "../../Context.js";
import { GraphQLRole } from "../GraphQLRole.js";
import { Role } from "../../model/index.js";
import { DataLoaderExecutor } from "../../loader.js";
import { validateIdFormat } from "../../util/validateIdFormat.js";
import { createV2AuthXScope } from "../../util/scopes.js";
import {
  ForbiddenError,
  ConflictError,
  NotFoundError,
  ValidationError,
} from "../../errors.js";
import { GraphQLCreateRoleInput } from "./GraphQLCreateRoleInput.js";

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
        new GraphQLList(new GraphQLNonNull(GraphQLCreateRoleInput)),
      ),
    },
  },
  async resolve(source, args, context): Promise<Promise<Role>[]> {
    const {
      executor: { strategies, connection: pool },
      authorization: a,
      realm,
    } = context;

    if (!a) {
      throw new ForbiddenError("You must be authenticated to create a role.");
    }

    if (!(pool instanceof pg.Pool)) {
      throw new Error(
        "INVARIANT: The executor connection is expected to be an instance of Pool.",
      );
    }

    const results = args.roles.map(async (input) => {
      // Validate `id`.
      if (typeof input.id === "string" && !validateIdFormat(input.id)) {
        throw new ValidationError("The provided `id` is an invalid ID.");
      }

      // Validate `userIds`.
      for (const userId of input.userIds) {
        if (!validateIdFormat(userId)) {
          throw new ValidationError(
            "The provided `userIds` list contains an invalid ID.",
          );
        }
      }

      // Validate `administration`.
      for (const { roleId } of input.administration) {
        if (!validateIdFormat(roleId)) {
          throw new ValidationError(
            "The provided `administration` list contains a `roleId` that is an invalid ID.",
          );
        }
      }

      const tx = await pool.connect();
      try {
        // Make sure this transaction is used for queries made by the executor.
        const executor = new DataLoaderExecutor<Pool | PoolClient>(
          tx,
          strategies,
        );

        if (
          !(await a.can(
            executor,
            realm,
            createV2AuthXScope(
              realm,
              {
                type: "role",
                roleId: "",
              },
              {
                basic: "*",
                scopes: "*",
                users: "*",
              },
            ),
          ))
        ) {
          throw new ForbiddenError(
            "You do not have permission to create roles.",
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
                await filter(await Role.read(executor, roleIDs), (role) =>
                  role.isAccessibleBy(realm, a, executor, {
                    basic: "w",
                    scopes: "",
                    users: "w",
                  }),
                )
              ).reduce<string[]>((acc, { scopes }) => {
                return [...acc, ...scopes];
              }, [])
            : [];

          if (!isSuperset(assignableScopes, input.scopes)) {
            throw new ForbiddenError(
              "You do not have permission to assign the provided scopes.",
            );
          }

          const id = input.id || v4();

          const roleScopeContext = {
            type: "role" as const,
            roleId: id,
          };

          const possibleAdministrationScopes = [
            createV2AuthXScope(realm, roleScopeContext, {
              basic: "r",
              scopes: "",
              users: "",
            }),
            createV2AuthXScope(realm, roleScopeContext, {
              basic: "r",
              scopes: "r",
              users: "",
            }),
            createV2AuthXScope(realm, roleScopeContext, {
              basic: "r",
              scopes: "",
              users: "r",
            }),
            createV2AuthXScope(realm, roleScopeContext, {
              basic: "r",
              scopes: "*",
              users: "*",
            }),
            createV2AuthXScope(realm, roleScopeContext, {
              basic: "w",
              scopes: "",
              users: "",
            }),
            createV2AuthXScope(realm, roleScopeContext, {
              basic: "w",
              scopes: "w",
              users: "",
            }),
            createV2AuthXScope(realm, roleScopeContext, {
              basic: "w",
              scopes: "",
              users: "w",
            }),
            createV2AuthXScope(realm, roleScopeContext, {
              basic: "w",
              scopes: "*",
              users: "*",
            }),
            createV2AuthXScope(realm, roleScopeContext, {
              basic: "*",
              scopes: "*",
              users: "*",
            }),
          ];

          let selfAdministrationScopes: string[] = [];

          // Add administration scopes.
          const administrationResults = await Promise.allSettled(
            input.administration.map(async ({ roleId, scopes }) => {
              // The role designates itself for administration.
              if (roleId === id) {
                selfAdministrationScopes = [
                  ...selfAdministrationScopes,
                  ...possibleAdministrationScopes.filter((possible) =>
                    isSuperset(scopes, possible),
                  ),
                ];
                return;
              }

              // Make sure we have permission to add scopes to the role.
              const administrationRoleBefore = await Role.read(tx, roleId, {
                forUpdate: true,
              });

              if (
                !(await administrationRoleBefore.isAccessibleBy(
                  realm,
                  a,
                  executor,
                  {
                    basic: "w",
                    scopes: "w",
                    users: "",
                  },
                ))
              ) {
                throw new ForbiddenError(
                  `You do not have permission to modify the scopes of role ${roleId}.`,
                );
              }

              // Update the role.
              const administrationRole = await Role.write(
                tx,
                {
                  ...administrationRoleBefore,
                  scopes: simplify([
                    ...administrationRoleBefore.scopes,
                    ...possibleAdministrationScopes.filter((possible) =>
                      isSuperset(scopes, possible),
                    ),
                  ]),
                },
                {
                  recordId: v4(),
                  createdByAuthorizationId: a.id,
                  createdAt: new Date(),
                },
              );

              // Clear and prime the loader.
              Role.clear(executor, administrationRole.id);
              Role.prime(executor, administrationRole.id, administrationRole);
            }),
          );

          for (const result of administrationResults) {
            if (result.status === "rejected") {
              throw new Error(result.reason);
            }
          }

          const role = await Role.write(
            tx,
            {
              id,
              enabled: input.enabled,
              name: input.name,
              description: input.description,
              scopes: simplify([...input.scopes, ...selfAdministrationScopes]),
              userIds: input.userIds,
            },
            {
              recordId: v4(),
              createdByAuthorizationId: a.id,
              createdAt: new Date(),
            },
          );

          await tx.query("COMMIT");

          // Clear and prime the loader.
          Role.clear(executor, role.id);
          Role.prime(executor, role.id, role);

          return role;
        } catch (error) {
          await tx.query("ROLLBACK");
          throw error;
        }
      } finally {
        tx.release();
      }
    });

    // Wait for all mutations to succeed or fail.
    await Promise.allSettled(results);

    // Set a new executor (clearing all memoized values).
    context.executor = new DataLoaderExecutor<Pool>(pool, strategies);

    return results;
  },
};
