import { v4 } from "uuid";
import { Pool, PoolClient } from "pg";
import { GraphQLFieldConfig, GraphQLNonNull, GraphQLList } from "graphql";
import { isSuperset, simplify } from "@authx/scopes";
import { Context } from "../../Context.js";
import { GraphQLUser } from "../GraphQLUser.js";
import { User, UserType, Role } from "../../model/index.js";
import { DataLoaderExecutor } from "../../loader.js";
import { validateIdFormat } from "../../util/validateIdFormat.js";
import { createV2AuthXScope } from "../../util/scopes.js";
import {
  ForbiddenError,
  ConflictError,
  NotFoundError,
  ValidationError,
} from "../../errors.js";
import { GraphQLCreateUserInput } from "./GraphQLCreateUserInput.js";

export const createUsers: GraphQLFieldConfig<
  any,
  Context,
  {
    users: {
      id: null | string;
      type: UserType;
      enabled: boolean;
      name: string;
      administration: {
        roleId: string;
        scopes: string[];
      }[];
    }[];
  }
> = {
  type: new GraphQLList(GraphQLUser),
  description: "Create a new user.",
  args: {
    users: {
      type: new GraphQLNonNull(
        new GraphQLList(new GraphQLNonNull(GraphQLCreateUserInput))
      ),
    },
  },
  async resolve(source, args, context): Promise<Promise<User>[]> {
    const {
      executor: { strategies, connection: pool },
      authorization: a,
      realm,
    } = context;

    if (!a) {
      throw new ForbiddenError("You must be authenticated to create a user.");
    }

    if (!(pool instanceof Pool)) {
      throw new Error(
        "INVARIANT: The executor connection is expected to be an instance of Pool."
      );
    }

    const results = args.users.map(async (input) => {
      // Validate `id`.
      if (typeof input.id === "string" && !validateIdFormat(input.id)) {
        throw new ValidationError("The provided `id` is an invalid ID.");
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
        const executor = new DataLoaderExecutor<Pool | PoolClient>(
          tx,
          strategies
        );

        // can create a new user
        if (
          !(await a.can(
            executor,
            realm,
            createV2AuthXScope(
              realm,
              {
                type: "user",
                userId: "",
              },
              {
                basic: "*",
                scopes: "",
              }
            )
          ))
        ) {
          throw new ForbiddenError(
            "You lack sufficient authorization to create a user."
          );
        }

        try {
          await tx.query("BEGIN DEFERRABLE");

          // Make sure the ID isn't already in use.
          if (input.id) {
            try {
              await User.read(tx, input.id, { forUpdate: true });
              throw new ConflictError();
            } catch (error) {
              if (!(error instanceof NotFoundError)) {
                throw error;
              }
            }
          }

          const id = input.id || v4();
          const user = await User.write(
            tx,
            {
              id,
              enabled: input.enabled,
              type: input.type,
              name: input.name,
            },
            {
              recordId: v4(),
              createdByAuthorizationId: a.id,
              createdAt: new Date(),
            }
          );

          const userScopeContext = {
            type: "user" as const,
            userId: id,
          };

          const grantScopeContext = {
            type: "grant" as const,
            clientId: "*",
            grantId: "*",
            userId: id,
          };

          const authorizationScopeContext = {
            type: "authorization" as const,
            authorizationId: "*",
            clientId: "*",
            grantId: "*",
            userId: id,
          };

          const possibleAdministrationScopes = [
            // user ------------------------------------------------------------
            createV2AuthXScope(realm, userScopeContext, {
              basic: "r",
              scopes: "",
            }),
            createV2AuthXScope(realm, userScopeContext, {
              basic: "w",
              scopes: "",
            }),
            createV2AuthXScope(realm, userScopeContext, {
              basic: "*",
              scopes: "",
            }),

            createV2AuthXScope(realm, grantScopeContext, {
              basic: "r",
              scopes: "",
              secrets: "",
            }),
            createV2AuthXScope(realm, grantScopeContext, {
              basic: "r",
              scopes: "",
              secrets: "",
            }),

            // grant -----------------------------------------------------------
            createV2AuthXScope(realm, grantScopeContext, {
              basic: "r",
              scopes: "",
              secrets: "",
            }),
            createV2AuthXScope(realm, grantScopeContext, {
              basic: "r",
              scopes: "r",
              secrets: "",
            }),
            createV2AuthXScope(realm, grantScopeContext, {
              basic: "r",
              scopes: "",
              secrets: "r",
            }),
            createV2AuthXScope(realm, grantScopeContext, {
              basic: "r",
              scopes: "*",
              secrets: "*",
            }),
            createV2AuthXScope(realm, grantScopeContext, {
              basic: "w",
              scopes: "",
              secrets: "",
            }),
            createV2AuthXScope(realm, grantScopeContext, {
              basic: "w",
              scopes: "w",
              secrets: "",
            }),
            createV2AuthXScope(realm, grantScopeContext, {
              basic: "w",
              scopes: "",
              secrets: "w",
            }),
            createV2AuthXScope(realm, grantScopeContext, {
              basic: "w",
              scopes: "*",
              secrets: "*",
            }),
            createV2AuthXScope(realm, grantScopeContext, {
              basic: "*",
              scopes: "*",
              secrets: "*",
            }),

            // authorization ---------------------------------------------------
            createV2AuthXScope(realm, authorizationScopeContext, {
              basic: "r",
              scopes: "",
              secrets: "",
            }),
            createV2AuthXScope(realm, authorizationScopeContext, {
              basic: "r",
              scopes: "r",
              secrets: "",
            }),
            createV2AuthXScope(realm, authorizationScopeContext, {
              basic: "r",
              scopes: "",
              secrets: "r",
            }),
            createV2AuthXScope(realm, authorizationScopeContext, {
              basic: "r",
              scopes: "*",
              secrets: "*",
            }),
            createV2AuthXScope(realm, authorizationScopeContext, {
              basic: "w",
              scopes: "",
              secrets: "",
            }),
            createV2AuthXScope(realm, authorizationScopeContext, {
              basic: "*",
              scopes: "*",
              secrets: "*",
            }),
          ];

          // Add administration scopes.
          await Promise.all(
            input.administration.map(async ({ roleId, scopes }) => {
              const administrationRoleBefore = await Role.read(tx, roleId, {
                forUpdate: true,
              });

              if (
                !administrationRoleBefore.isAccessibleBy(realm, a, executor, {
                  basic: "w",
                  scopes: "w",
                  users: "",
                })
              ) {
                throw new ForbiddenError(
                  `You do not have permission to modify the scopes of role ${roleId}.`
                );
              }

              const administrationRole = await Role.write(
                tx,
                {
                  ...administrationRoleBefore,
                  scopes: simplify([
                    ...administrationRoleBefore.scopes,
                    ...possibleAdministrationScopes.filter((possible) =>
                      isSuperset(scopes, possible)
                    ),
                  ]),
                },
                {
                  recordId: v4(),
                  createdByAuthorizationId: a.id,
                  createdAt: new Date(),
                }
              );

              // Clear and prime the loader.
              Role.clear(executor, administrationRole.id);
              Role.prime(executor, administrationRole.id, administrationRole);
            })
          );

          await tx.query("COMMIT");

          // Clear and prime the loader.
          User.clear(executor, user.id);
          User.prime(executor, user.id, user);

          return user;
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
