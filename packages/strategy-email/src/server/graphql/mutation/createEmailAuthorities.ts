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
import { EmailAuthority } from "../../model";
import { GraphQLEmailAuthority } from "../GraphQLEmailAuthority";
import { GraphQLCreateEmailAuthorityInput } from "./GraphQLCreateEmailAuthorityInput";

export const createEmailAuthorities: GraphQLFieldConfig<
  any,
  Context,
  {
    authorities: {
      id: null | string;
      enabled: boolean;
      name: string;
      description: string;
      privateKey: string;
      publicKeys: string[];
      proofValidityDuration: number;
      authenticationEmailSubject: string;
      authenticationEmailText: string;
      authenticationEmailHtml: string;
      verificationEmailSubject: string;
      verificationEmailText: string;
      verificationEmailHtml: string;
      administration: {
        roleId: string;
        scopes: string[];
      }[];
    }[];
  }
> = {
  type: new GraphQLList(GraphQLEmailAuthority),
  description: "Create a new email authority.",
  args: {
    authorities: {
      type: new GraphQLNonNull(
        new GraphQLList(new GraphQLNonNull(GraphQLCreateEmailAuthorityInput))
      ),
    },
  },
  async resolve(source, args, context): Promise<Promise<EmailAuthority>[]> {
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

    return args.authorities.map(async (input) => {
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
          const authority = await EmailAuthority.write(
            tx,
            {
              id,
              strategy: "email",
              enabled: input.enabled,
              name: input.name,
              description: input.description,
              details: {
                privateKey: input.privateKey,
                publicKeys: input.publicKeys,
                proofValidityDuration: input.proofValidityDuration,
                authenticationEmailSubject: input.authenticationEmailSubject,
                authenticationEmailText: input.authenticationEmailText,
                authenticationEmailHtml: input.authenticationEmailHtml,
                verificationEmailSubject: input.verificationEmailSubject,
                verificationEmailText: input.verificationEmailText,
                verificationEmailHtml: input.verificationEmailHtml,
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
  },
};
