import { v4 } from "uuid";
import { Pool, PoolClient } from "pg";
import { randomBytes } from "crypto";
import { isSuperset, simplify } from "@authx/scopes";
import { GraphQLFieldConfig, GraphQLList, GraphQLNonNull } from "graphql";
import { Context } from "../../Context.js";
import { GraphQLAuthorization } from "../GraphQLAuthorization.js";
import { Authorization, Grant, Role } from "../../model/index.js";
import { DataLoaderExecutor } from "../../loader.js";
import { validateIdFormat } from "../../util/validateIdFormat.js";
import { createV2AuthXScope } from "../../util/scopes.js";
import {
  ForbiddenError,
  ConflictError,
  NotFoundError,
  ValidationError,
} from "../../errors.js";
import { GraphQLCreateAuthorizationInput } from "./GraphQLCreateAuthorizationInput.js";

export const createAuthorizations: GraphQLFieldConfig<
  any,
  Context,
  {
    authorizations: {
      id: null | string;
      enabled: boolean;
      userId: string;
      grantId: null | string;
      scopes: string[];
      administration: {
        roleId: string;
        scopes: string[];
      }[];
    }[];
  }
> = {
  type: new GraphQLList(GraphQLAuthorization),
  description: "Create a new authorization.",
  args: {
    authorizations: {
      type: new GraphQLNonNull(
        new GraphQLList(new GraphQLNonNull(GraphQLCreateAuthorizationInput))
      ),
    },
  },
  async resolve(source, args, context): Promise<Promise<Authorization>[]> {
    const {
      executor: { strategies, connection: pool },
      authorization: a,
      realm,
    } = context;

    if (!a) {
      throw new ForbiddenError(
        "You must be authenticated to create an authorization."
      );
    }

    if (!(pool instanceof Pool)) {
      throw new Error(
        "INVARIANT: The executor connection is expected to be an instance of Pool."
      );
    }

    const results = args.authorizations.map(async (input) => {
      // Validate `id`.
      if (typeof input.id === "string" && !validateIdFormat(input.id)) {
        throw new ValidationError("The provided `id` is an invalid ID.");
      }

      // Validate `userId`.
      if (!validateIdFormat(input.userId)) {
        throw new ValidationError("The provided `userId` is an invalid ID.");
      }

      // Validate `grantId`.
      if (
        typeof input.grantId === "string" &&
        !validateIdFormat(input.grantId)
      ) {
        throw new ValidationError("The provided `grantId` is an invalid ID.");
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

        const grant = input.grantId
          ? await Grant.read(executor, input.grantId)
          : null;

        if (
          !(await a.can(
            executor,
            realm,
            createV2AuthXScope(
              realm,
              {
                type: "authorization",
                authorizationId: "",
                clientId: grant?.clientId ?? "",
                grantId: grant?.id ?? "",
                userId: input.userId,
              },
              {
                basic: "*",
                scopes: "*",
                secrets: "*",
              }
            )
          ))
        ) {
          throw new ForbiddenError(
            "You do not have permission to create this authorization."
          );
        }

        try {
          await tx.query("BEGIN DEFERRABLE");

          // Make sure the ID isn't already in use.
          if (input.id) {
            try {
              await Authorization.read(tx, input.id, { forUpdate: true });
              throw new ConflictError();
            } catch (error) {
              if (!(error instanceof NotFoundError)) {
                throw error;
              }
            }
          }

          const id = input.id || v4();
          const authorization = await Authorization.write(
            tx,
            {
              id,
              enabled: input.enabled,
              userId: input.userId,
              grantId: input.grantId,
              secret: randomBytes(16).toString("hex"),
              scopes: input.scopes,
            },
            {
              recordId: v4(),
              createdByAuthorizationId: a.id,
              createdByCredentialId: null,
              createdAt: new Date(),
            }
          );

          const authorizationScopeContext = {
            type: "authorization" as const,
            authorizationId: id,
            clientId: grant?.clientId ?? "",
            grantId: grant?.id ?? "",
            userId: input.userId,
          };

          const possibleAdministrationScopes = [
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
          const administrationResults = await Promise.allSettled(
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

          for (const result of administrationResults) {
            if (result.status === "rejected") {
              throw new Error(result.reason);
            }
          }

          await tx.query("COMMIT");

          return authorization;
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
