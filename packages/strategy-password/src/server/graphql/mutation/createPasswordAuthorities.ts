import { v4 } from "uuid";
import { Pool, PoolClient } from "pg";
import { GraphQLList, GraphQLFieldConfig, GraphQLNonNull } from "graphql";

import {
  Context,
  ForbiddenError,
  ConflictError,
  NotFoundError,
  ValidationError,
  Role,
  validateIdFormat,
  DataLoaderExecutor,
  Authority
} from "@authx/authx";

import { createV2AuthXScope } from "@authx/authx/scopes";

import { isSuperset, simplify, isValidScopeLiteral } from "@authx/scopes";
import { PasswordAuthority } from "../../model";
import { GraphQLPasswordAuthority } from "../GraphQLPasswordAuthority";
import { GraphQLCreatePasswordAuthorityInput } from "./GraphQLCreatePasswordAuthorityInput";

export const createPasswordAuthorities: GraphQLFieldConfig<
  any,
  Context,
  {
    authorities: {
      id: null | string;
      enabled: boolean;
      name: string;
      description: string;
      rounds: number;
      administration: {
        roleId: string;
        scopes: string[];
      }[];
    }[];
  }
> = {
  type: new GraphQLList(GraphQLPasswordAuthority),
  description: "Create a new password authority.",
  args: {
    authorities: {
      type: new GraphQLNonNull(
        new GraphQLList(new GraphQLNonNull(GraphQLCreatePasswordAuthorityInput))
      )
    }
  },
  async resolve(source, args, context): Promise<Promise<PasswordAuthority>[]> {
    const { executor, authorization: a, realm } = context;

    if (!a) {
      throw new ForbiddenError(
        "You must be authenticated to create a authority."
      );
    }

    const strategies = executor.strategies;
    const pool = executor.connection;
    if (!(pool instanceof Pool)) {
      throw new Error(
        "INVARIANT: The executor connection is expected to be an instance of Pool."
      );
    }

    return args.authorities.map(async input => {
      // Validate `id`.
      if (typeof input.id === "string" && !validateIdFormat(input.id)) {
        throw new ValidationError("The provided `id` is an invalid ID.");
      }

      // Validate `administration`.
      for (const { roleId, scopes } of input.administration) {
        if (!validateIdFormat(roleId)) {
          throw new ValidationError(
            "The provided `administration` list contains a `roleId` that is an invalid ID."
          );
        }

        for (const scope of scopes) {
          if (!isValidScopeLiteral(scope)) {
            throw new ValidationError(
              "The provided `administration` list contains a `scopes` list with an invalid scope."
            );
          }
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
                type: "authority",
                authorityId: ""
              },
              {
                basic: "*",
                details: "*"
              }
            )
          ))
        ) {
          throw new ForbiddenError(
            "You do not have permission to create an authority."
          );
        }

        try {
          await tx.query("BEGIN DEFERRABLE");

          // Make sure the ID isn't already in use.
          if (input.id) {
            try {
              await Authority.read(tx, input.id, strategies, {
                forUpdate: true
              });
              throw new ConflictError();
            } catch (error) {
              if (!(error instanceof NotFoundError)) {
                throw error;
              }
            }
          }

          const id = input.id || v4();
          const authority = await PasswordAuthority.write(
            tx,
            {
              id,
              strategy: "password",
              enabled: input.enabled,
              name: input.name,
              description: input.description,
              details: {
                rounds: input.rounds
              }
            },
            {
              recordId: v4(),
              createdByAuthorizationId: a.id,
              createdAt: new Date()
            }
          );

          const possibleAdministrationScopes = [
            createV2AuthXScope(
              realm,
              {
                type: "authority",
                authorityId: id
              },
              {
                basic: "r",
                details: ""
              }
            ),
            createV2AuthXScope(
              realm,
              {
                type: "authority",
                authorityId: id
              },
              {
                basic: "r",
                details: "r"
              }
            ),
            createV2AuthXScope(
              realm,
              {
                type: "authority",
                authorityId: id
              },
              {
                basic: "r",
                details: "*"
              }
            ),
            createV2AuthXScope(
              realm,
              {
                type: "authority",
                authorityId: id
              },
              {
                basic: "w",
                details: ""
              }
            ),
            createV2AuthXScope(
              realm,
              {
                type: "authority",
                authorityId: id
              },
              {
                basic: "w",
                details: "w"
              }
            ),
            createV2AuthXScope(
              realm,
              {
                type: "authority",
                authorityId: id
              },
              {
                basic: "w",
                details: "*"
              }
            ),
            createV2AuthXScope(
              realm,
              {
                type: "authority",
                authorityId: id
              },
              {
                basic: "*",
                details: "*"
              }
            )
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
          PasswordAuthority.clear(executor, authority.id);
          PasswordAuthority.prime(executor, authority.id, authority);

          // Update the context to use a new executor primed with the results of
          // this mutation, using the original connection pool.
          executor.connection = pool;
          context.executor = executor as DataLoaderExecutor<Pool>;

          return authority;
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
