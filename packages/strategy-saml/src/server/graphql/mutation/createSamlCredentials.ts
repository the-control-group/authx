import { v4 } from "uuid";
import { Pool, PoolClient } from "pg";
import { GraphQLFieldConfig, GraphQLList, GraphQLNonNull } from "graphql";

import {
  Authority,
  ConflictError,
  Context,
  Credential,
  DataLoaderExecutor,
  ForbiddenError,
  NotFoundError,
  ReadonlyDataLoaderExecutor,
  Role,
  validateIdFormat,
  ValidationError,
} from "@authx/authx";

import {
  createV2AuthXScope,
  createV2CredentialAdministrationScopes,
} from "@authx/authx/scopes";

import { isSuperset, simplify } from "@authx/scopes";
import { SamlAuthority, SamlCredential } from "../../model";
import { GraphQLSamlCredential } from "../GraphQLSamlCredential";
import { GraphQLCreateSamlCredentialInput } from "./GraphQLCreateSamlCredentialInput";

export const createSamlCredentials: GraphQLFieldConfig<
  any,
  Context,
  {
    credentials: {
      id: null | string;
      enabled: boolean;
      userId: string;
      authorityId: string;
      nameId: null | string;
      administration: {
        roleId: string;
        scopes: string[];
      }[];
    }[];
  }
> = {
  type: new GraphQLList(GraphQLSamlCredential),
  description: "Create a new credential.",
  args: {
    credentials: {
      type: new GraphQLNonNull(
        new GraphQLList(new GraphQLNonNull(GraphQLCreateSamlCredentialInput))
      ),
    },
  },
  async resolve(source, args, context): Promise<Promise<SamlCredential>[]> {
    const { executor, authorization: a, realm } = context;

    if (!a) {
      throw new ForbiddenError(
        "You must be authenticated to create a credential."
      );
    }

    const strategies = executor.strategies;
    const pool = executor.connection;
    if (!(pool instanceof Pool)) {
      throw new Error(
        "INVARIANT: The executor connection is expected to be an instance of Pool."
      );
    }

    return args.credentials.map(async (input) => {
      // Validate `id`.
      if (typeof input.id === "string" && !validateIdFormat(input.id)) {
        throw new ValidationError("The provided `id` is an invalid ID.");
      }

      // Validate `authorityId`.
      if (!validateIdFormat(input.authorityId)) {
        throw new ValidationError(
          "The provided `authorityId` is an invalid ID."
        );
      }

      // Validate `userId`.
      if (!validateIdFormat(input.userId)) {
        throw new ValidationError("The provided `userId` is an invalid ID.");
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

        await tx.query("BEGIN DEFERRABLE");

        // Make sure the ID isn't already in use.
        if (input.id) {
          try {
            await Credential.read(tx, input.id, strategies, {
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

        // Fetch the authority.
        const authority = await Authority.read(
          tx,
          input.authorityId,
          strategies
        );

        if (!(authority instanceof SamlAuthority)) {
          throw new NotFoundError(
            "The authority uses a strategy other than Saml."
          );
        }

        if (!input.nameId) {
          throw new ValidationError("`nameId` must be specified..");
        }

        // Check if the Saml is used in a different credential
        const existingCredentials = await SamlCredential.read(
          executor,
          (
            await tx.query(
              `
          SELECT entity_id as id
          FROM authx.credential_record
          WHERE
            replacement_record_id IS NULL
            AND enabled = TRUE
            AND authority_id = $1
            AND authority_user_id = $2
          `,
              [authority.id, input.nameId]
            )
          ).rows.map(({ id }) => id)
        );

        if (existingCredentials.length > 1) {
          throw new Error(
            "INVARIANT: There cannot be more than one active credential with the same authorityId and authorityUserId."
          );
        }

        // The user cannot create a credential for this user and authority.
        if (
          !(await a.can(
            executor,
            realm,
            createV2AuthXScope(
              realm,
              {
                type: "credential",
                credentialId: "",
                authorityId: input.authorityId,
                userId: input.userId,
              },
              {
                basic: "*",
                details: "*",
              }
            )
          ))
        ) {
          throw new ForbiddenError(
            "You do not have permission to create this credential."
          );
        }

        // The user doesn't have permission to change the credentials of all
        // users, so in order to save this credential, she must prove control of
        // the account with the Saml provider.
        if (
          !(await a.can(
            executor,
            realm,
            createV2AuthXScope(
              realm,
              {
                type: "credential",
                credentialId: "",
                authorityId: input.authorityId,
                userId: "*",
              },
              {
                basic: "*",
                details: "*",
              }
            )
          ))
        ) {
          throw new ForbiddenError(
            "You do not have permission to create this credential."
          );
        }

        // Disable the conflicting credential
        if (existingCredentials.length === 1) {
          await SamlCredential.write(
            tx,
            {
              ...existingCredentials[0],
              enabled: false,
            },
            {
              recordId: v4(),
              createdByAuthorizationId: a.id,
              createdAt: new Date(),
            }
          );
        }

        const credential = await SamlCredential.write(
          tx,
          {
            id,
            enabled: input.enabled,
            authorityId: input.authorityId,
            userId: input.userId,
            authorityUserId: input.nameId,
            details: {},
          },
          {
            recordId: v4(),
            createdByAuthorizationId: a.id,
            createdAt: new Date(),
          }
        );

        const possibleAdministrationScopes = createV2CredentialAdministrationScopes(
          realm,
          {
            type: "credential",
            authorityId: credential.authorityId,
            credentialId: id,
            userId: credential.userId,
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
        Credential.clear(executor, credential.id);
        Credential.prime(executor, credential.id, credential);

        // Update the context to use a new executor primed with the results of
        // this mutation, using the original connection pool.
        executor.connection = pool;
        context.executor = executor as ReadonlyDataLoaderExecutor<Pool>;

        return credential;
      } catch (error) {
        await tx.query("ROLLBACK");
        throw error;
      } finally {
        tx.release();
      }
    });
  },
};
