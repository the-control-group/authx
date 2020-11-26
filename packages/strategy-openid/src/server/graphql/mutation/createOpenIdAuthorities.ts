import { v4 } from "uuid";
import { Pool, PoolClient } from "pg";
import { GraphQLFieldConfig, GraphQLNonNull, GraphQLList } from "graphql";

import {
  Context,
  ForbiddenError,
  ConflictError,
  NotFoundError,
  ValidationError,
  Role,
  validateIdFormat,
  DataLoaderExecutor,
  Authority,
} from "@authx/authx";

import {
  createV2AuthXScope,
  createV2AuthorityAdministrationScopes,
} from "@authx/authx/scopes";

import { isSuperset, simplify } from "@authx/scopes";
import { OpenIdAuthority } from "../../model";
import { GraphQLOpenIdAuthority } from "../GraphQLOpenIdAuthority";
import { GraphQLCreateOpenIdAuthorityInput } from "./GraphQLCreateOpenIdAuthorityInput";

export const createOpenIdAuthorities: GraphQLFieldConfig<
  any,
  Context,
  {
    authorities: {
      id: null | string;
      enabled: boolean;
      name: string;
      description: string;
      authUrl: string;
      tokenUrl: string;
      clientId: string;
      clientSecret: string;
      restrictsAccountsToHostedDomains: string[];
      emailAuthorityId: null | string;
      matchesUsersByEmail: boolean;
      createsUnmatchedUsers: boolean;
      assignsCreatedUsersToRoleIds: string[];
      administration: {
        roleId: string;
        scopes: string[];
      }[];
    }[];
  }
> = {
  type: new GraphQLList(GraphQLOpenIdAuthority),
  description: "Create a new openid authority.",
  args: {
    authorities: {
      type: new GraphQLNonNull(
        new GraphQLList(new GraphQLNonNull(GraphQLCreateOpenIdAuthorityInput))
      ),
    },
  },
  async resolve(source, args, context): Promise<Promise<OpenIdAuthority>[]> {
    const {
      executor: { strategies, connection: pool },
      authorization: a,
      realm,
    } = context;

    if (!a) {
      throw new ForbiddenError(
        "You must be authenticated to create a authority."
      );
    }

    if (!(pool instanceof Pool)) {
      throw new Error(
        "INVARIANT: The executor connection is expected to be an instance of Pool."
      );
    }

    const results = args.authorities.map(async (input) => {
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

        if (
          !(await a.can(
            executor,
            realm,
            createV2AuthXScope(
              realm,
              {
                type: "authority",
                authorityId: "",
              },
              {
                basic: "*",
                details: "*",
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
                forUpdate: true,
              });
              throw new ConflictError();
            } catch (error) {
              if (!(error instanceof NotFoundError)) {
                throw error;
              }
            }
          }

          const id = input.id || v4();
          const authority = await OpenIdAuthority.write(
            tx,
            {
              id,
              strategy: "openid",
              enabled: input.enabled,
              name: input.name,
              description: input.description,
              details: {
                authUrl: input.authUrl,
                tokenUrl: input.tokenUrl,
                clientId: input.clientId,
                clientSecret: input.clientSecret,
                restrictsAccountsToHostedDomains:
                  input.restrictsAccountsToHostedDomains,
                emailAuthorityId: input.emailAuthorityId,
                matchesUsersByEmail: input.matchesUsersByEmail,
                createsUnmatchedUsers: input.createsUnmatchedUsers,
                assignsCreatedUsersToRoleIds:
                  input.assignsCreatedUsersToRoleIds,
              },
            },
            {
              recordId: v4(),
              createdByAuthorizationId: a.id,
              createdAt: new Date(),
            }
          );

          const possibleAdministrationScopes = createV2AuthorityAdministrationScopes(
            realm,
            {
              type: "authority",
              authorityId: id,
            }
          );

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

          // Clear and prime the loader.
          Authority.clear(executor, authority.id);
          Authority.prime(executor, authority.id, authority);

          return authority;
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
