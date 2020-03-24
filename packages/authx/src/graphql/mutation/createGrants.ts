import { v4 } from "uuid";
import { Pool, PoolClient } from "pg";
import { randomBytes } from "crypto";
import { isSuperset, simplify } from "@authx/scopes";
import { GraphQLFieldConfig, GraphQLList, GraphQLNonNull } from "graphql";
import { Context } from "../../Context";
import { GraphQLGrant } from "../GraphQLGrant";
import { Grant, Role } from "../../model";
import { DataLoaderExecutor } from "../../loader";
import { validateIdFormat } from "../../util/validateIdFormat";
import { createV2AuthXScope } from "../../util/scopes";
import {
  ForbiddenError,
  ConflictError,
  NotFoundError,
  ValidationError
} from "../../errors";
import { GraphQLCreateGrantInput } from "./GraphQLCreateGrantInput";

export const createGrants: GraphQLFieldConfig<
  any,
  Context,
  {
    grants: {
      id: null | string;
      enabled: boolean;
      userId: string;
      clientId: string;
      scopes: string[];
      administration: {
        roleId: string;
        scopes: string[];
      }[];
    }[];
  }
> = {
  type: new GraphQLList(GraphQLGrant),
  description: "Create a new grant.",
  args: {
    grants: {
      type: new GraphQLNonNull(
        new GraphQLList(new GraphQLNonNull(GraphQLCreateGrantInput))
      )
    }
  },
  async resolve(source, args, context): Promise<Promise<Grant>[]> {
    const { executor, authorization: a, realm } = context;

    if (!a) {
      throw new ForbiddenError("You must be authenticated to create a grant.");
    }

    const strategies = executor.strategies;
    const pool = executor.connection;
    if (!(pool instanceof Pool)) {
      throw new Error(
        "INVARIANT: The executor connection is expected to be an instance of Pool."
      );
    }

    return args.grants.map(async input => {
      // Validate `id`.
      if (typeof input.id === "string" && !validateIdFormat(input.id)) {
        throw new ValidationError("The provided `id` is an invalid ID.");
      }

      // Validate `userId`.
      if (!validateIdFormat(input.userId)) {
        throw new ValidationError("The provided `userId` is an invalid ID.");
      }

      // Validate `clientId`.
      if (!validateIdFormat(input.clientId)) {
        throw new ValidationError("The provided `clientId` is an invalid ID.");
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

        if (
          !(await a.can(
            executor,
            createV2AuthXScope(
              realm,
              {
                type: "grant",
                clientId: input.clientId,
                grantId: "",
                userId: input.userId
              },
              {
                basic: "*",
                scopes: "*",
                secrets: "*"
              }
            )
          ))
        ) {
          throw new ForbiddenError(
            "You do not have permission to create this grant."
          );
        }

        try {
          await tx.query("BEGIN DEFERRABLE");

          // Make sure the ID isn't already in use.
          if (input.id) {
            try {
              await Grant.read(tx, input.id, { forUpdate: true });
              throw new ConflictError();
            } catch (error) {
              if (!(error instanceof NotFoundError)) {
                throw error;
              }
            }
          }

          const id = input.id || v4();
          const now = Math.floor(Date.now() / 1000);
          const grant = await Grant.write(
            tx,
            {
              id,
              enabled: input.enabled,
              userId: input.userId,
              clientId: input.clientId,
              secrets: [
                Buffer.from(
                  [id, now, randomBytes(16).toString("hex")].join(":")
                ).toString("base64")
              ],
              codes: [
                Buffer.from(
                  [id, now, randomBytes(16).toString("hex")].join(":")
                ).toString("base64")
              ],
              scopes: input.scopes
            },
            {
              recordId: v4(),
              createdByAuthorizationId: a.id,
              createdAt: new Date()
            }
          );

          const grantScopeContext = {
            type: "grant" as "grant",
            clientId: input.clientId,
            grantId: id,
            userId: input.userId
          };

          const authorizationScopeContext = {
            type: "authorization" as "authorization",
            authorizationId: "*",
            clientId: input.clientId,
            grantId: id,
            userId: input.userId
          };

          const possibleAdministrationScopes = [
            // grant -----------------------------------------------------------
            createV2AuthXScope(realm, grantScopeContext, {
              basic: "r",
              scopes: "",
              secrets: ""
            }),
            createV2AuthXScope(realm, grantScopeContext, {
              basic: "r",
              scopes: "r",
              secrets: ""
            }),
            createV2AuthXScope(realm, grantScopeContext, {
              basic: "r",
              scopes: "",
              secrets: "r"
            }),
            createV2AuthXScope(realm, grantScopeContext, {
              basic: "r",
              scopes: "*",
              secrets: "*"
            }),
            createV2AuthXScope(realm, grantScopeContext, {
              basic: "w",
              scopes: "",
              secrets: ""
            }),
            createV2AuthXScope(realm, grantScopeContext, {
              basic: "w",
              scopes: "w",
              secrets: ""
            }),
            createV2AuthXScope(realm, grantScopeContext, {
              basic: "w",
              scopes: "",
              secrets: "w"
            }),
            createV2AuthXScope(realm, grantScopeContext, {
              basic: "w",
              scopes: "*",
              secrets: "*"
            }),
            createV2AuthXScope(realm, grantScopeContext, {
              basic: "*",
              scopes: "*",
              secrets: "*"
            }),

            // authorization ---------------------------------------------------
            createV2AuthXScope(realm, authorizationScopeContext, {
              basic: "r",
              scopes: "",
              secrets: ""
            }),
            createV2AuthXScope(realm, authorizationScopeContext, {
              basic: "r",
              scopes: "r",
              secrets: ""
            }),
            createV2AuthXScope(realm, authorizationScopeContext, {
              basic: "r",
              scopes: "",
              secrets: "r"
            }),
            createV2AuthXScope(realm, authorizationScopeContext, {
              basic: "r",
              scopes: "*",
              secrets: "*"
            }),
            createV2AuthXScope(realm, authorizationScopeContext, {
              basic: "w",
              scopes: "",
              secrets: ""
            }),
            createV2AuthXScope(realm, authorizationScopeContext, {
              basic: "*",
              scopes: "*",
              secrets: "*"
            })
          ];

          // Add administration scopes.
          await Promise.all(
            input.administration.map(async ({ roleId, scopes }) => {
              const administrationRoleBefore = await Role.read(tx, roleId, {
                forUpdate: true
              });

              if (
                !administrationRoleBefore.isAccessibleBy(realm, a, executor, {
                  basic: "w",
                  scopes: "w",
                  users: ""
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

              // Clear and prime the loader.
              Role.clear(executor, administrationRole.id);
              Role.prime(executor, administrationRole.id, administrationRole);
            })
          );

          await tx.query("COMMIT");

          // Clear and prime the loader.
          Grant.clear(executor, grant.id);
          Grant.prime(executor, grant.id, grant);

          // Update the context to use a new executor primed with the results of
          // this mutation, using the original connection pool.
          executor.connection = pool;
          context.executor = executor as DataLoaderExecutor<Pool>;

          return grant;
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
