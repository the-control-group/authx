import { v4 } from "uuid";
import { Pool, PoolClient } from "pg";
import jwt from "jsonwebtoken";
import { GraphQLFieldConfig, GraphQLNonNull, GraphQLList } from "graphql";

import {
  Credential,
  Context,
  Authority,
  ForbiddenError,
  ConflictError,
  NotFoundError,
  ValidationError,
  Role,
  validateIdFormat,
  DataLoaderExecutor,
  ReadonlyDataLoaderExecutor
} from "@authx/authx";

import {
  createV2AuthXScope,
  createV2CredentialAdministrationScopes
} from "@authx/authx/scopes";

import { isSuperset, simplify } from "@authx/scopes";
import { EmailCredential, EmailAuthority } from "../../model";
import { GraphQLEmailCredential } from "../GraphQLEmailCredential";
import { substitute } from "../../substitute";
import { GraphQLCreateEmailCredentialInput } from "./GraphQLCreateEmailCredentialInput";

export const createEmailCredentials: GraphQLFieldConfig<
  any,
  Context,
  {
    credentials: {
      id: null | string;
      enabled: boolean;
      userId: string;
      authorityId: string;
      email: string;
      proof: null | string;
      administration: {
        roleId: string;
        scopes: string[];
      }[];
    }[];
  }
> = {
  type: new GraphQLList(GraphQLEmailCredential),
  description: "Create a new credential.",
  args: {
    credentials: {
      type: new GraphQLNonNull(
        new GraphQLList(new GraphQLNonNull(GraphQLCreateEmailCredentialInput))
      )
    }
  },
  async resolve(source, args, context): Promise<Promise<EmailCredential>[]> {
    const { executor, authorization: a, realm, base, sendMail } = context;

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

    return args.credentials.map(async input => {
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
        const authority = await Authority.read(
          tx,
          input.authorityId,
          strategies,
          { forUpdate: true }
        );
        if (!(authority instanceof EmailAuthority)) {
          throw new NotFoundError("No email authority exists with this ID.");
        }

        // Check if the email is used in a different credential
        const existingCredentials = await EmailCredential.read(
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
          FOR UPDATE
          `,
              [authority.id, input.email]
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
            createV2AuthXScope(
              realm,
              {
                type: "credential",
                credentialId: "",
                authorityId: input.authorityId,
                userId: input.userId
              },
              {
                basic: "*",
                details: "*"
              }
            )
          ))
        ) {
          throw new ForbiddenError(
            "You do not have permission to create this credential."
          );
        }

        // The user cannot create a credential for all users.
        if (
          !(await a.can(
            executor,
            createV2AuthXScope(
              realm,
              {
                type: "credential",
                credentialId: "",
                authorityId: input.authorityId,
                userId: "*"
              },
              {
                basic: "*",
                details: "*"
              }
            )
          ))
        ) {
          // The user doesn't have permission to change the credentials of all
          // users, but has passed a proof that she controls the email address, so
          // we can treat it as hers.
          const { proof } = input;
          if (proof) {
            if (
              !authority.details.publicKeys.some(key => {
                try {
                  const payload = jwt.verify(proof, key, {
                    algorithms: ["RS512"]
                  });

                  // Make sure we're using the same email
                  if ((payload as any).email !== input.email) {
                    throw new ForbiddenError(
                      "This proof was generated for a different email address."
                    );
                  }

                  // Make sure this is for the same user
                  if ((payload as any).sub !== a.userId) {
                    throw new ForbiddenError(
                      "This proof was generated for a different user."
                    );
                  }

                  return true;
                } catch (error) {
                  if (error instanceof ForbiddenError) {
                    throw error;
                  }

                  return false;
                }
              })
            ) {
              throw new ForbiddenError("The proof is invalid.");
            }
          }

          // The user doesn't have permission to change the credentials of all
          // users, so she needs to prove control of the email address.
          else {
            const proofId = v4();

            // Generate a new proof
            const proof = jwt.sign(
              {
                email: input.email
              },
              authority.details.privateKey,
              {
                algorithm: "RS512",
                expiresIn: authority.details.proofValidityDuration,
                subject: a.userId,
                jwtid: proofId
              }
            );

            const url =
              base +
              `?authorityId=${authority.id}&proof=${encodeURIComponent(base)}`;

            // TODO: Add a code to any existing credential with the same address

            // Send an email
            await sendMail({
              to: input.email,
              subject: authority.details.verificationEmailSubject,
              text: substitute(
                { proof, url },
                authority.details.verificationEmailText
              ),
              html: substitute(
                { proof, url },
                authority.details.verificationEmailHtml
              )
            });

            throw new ForbiddenError(
              "An email has been sent to this address with a code that can be used to prove control."
            );
          }
        }

        // Disable the conflicting credential
        if (existingCredentials.length === 1) {
          await EmailCredential.write(
            tx,
            {
              ...existingCredentials[0],
              enabled: false
            },
            {
              recordId: v4(),
              createdByAuthorizationId: a.id,
              createdAt: new Date()
            }
          );
        }

        const credential = await EmailCredential.write(
          tx,
          {
            id,
            enabled: input.enabled,
            authorityId: input.authorityId,
            userId: input.userId,
            authorityUserId: input.email,
            details: {}
          },
          {
            recordId: v4(),
            createdByAuthorizationId: a.id,
            createdAt: new Date()
          }
        );

        const possibleAdministrationScopes = createV2CredentialAdministrationScopes(
          realm,
          {
            type: "credential",
            authorityId: credential.authorityId,
            credentialId: id,
            userId: credential.userId
          }
        );

        // Add administration scopes.
        const administrationResults = await Promise.allSettled(
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
  }
};
