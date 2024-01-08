import { v4 } from "uuid";
import pg, { Pool, PoolClient } from "pg";
import jwt from "jsonwebtoken";
import { GraphQLFieldConfig, GraphQLNonNull, GraphQLList } from "graphql";

import {
  Credential,
  Context,
  Authority,
  ForbiddenError,
  NotFoundError,
  ValidationError,
  ConflictError,
  AuthenticationError,
  Role,
  validateIdFormat,
  DataLoaderExecutor,
} from "@authx/authx";

import {
  createV2AuthXScope,
  createV2CredentialAdministrationScopes,
} from "@authx/authx/scopes.js";

import { isSuperset, simplify } from "@authx/scopes";
import { OpenIdCredential, OpenIdAuthority } from "../../model/index.js";
import { GraphQLOpenIdCredential } from "../GraphQLOpenIdCredential.js";
import { GraphQLCreateOpenIdCredentialInput } from "./GraphQLCreateOpenIdCredentialInput.js";

export const createOpenIdCredentials: GraphQLFieldConfig<
  any,
  Context,
  {
    credentials: {
      id: null | string;
      enabled: boolean;
      userId: string;
      authorityId: string;
      code: null | string;
      subject: null | string;
      administration: {
        roleId: string;
        scopes: string[];
      }[];
    }[];
  }
> = {
  type: new GraphQLList(GraphQLOpenIdCredential),
  description: "Create a new credential.",
  args: {
    credentials: {
      type: new GraphQLNonNull(
        new GraphQLList(new GraphQLNonNull(GraphQLCreateOpenIdCredentialInput))
      ),
    },
  },
  async resolve(source, args, context): Promise<Promise<OpenIdCredential>[]> {
    const {
      executor: { strategies, connection: pool },
      authorization: a,
      realm,
      base,
    } = context;

    if (!a) {
      throw new ForbiddenError(
        "You must be authenticated to create a credential."
      );
    }

    if (!(pool instanceof pg.Pool)) {
      throw new Error(
        "INVARIANT: The executor connection is expected to be an instance of Pool."
      );
    }

    const results = args.credentials.map(async (input) => {
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

        if (!(authority instanceof OpenIdAuthority)) {
          throw new NotFoundError(
            "The authority uses a strategy other than openid."
          );
        }

        if (!input.code && !input.subject) {
          throw new ValidationError(
            "Either a `code` or `subject` must be provided."
          );
        }

        if (
          typeof input.code === "string" &&
          typeof input.subject === "string"
        ) {
          throw new ValidationError(
            "Only one of `code` or `subject` may be provided."
          );
        }

        let subject = input.subject;

        // Exchange the authorization code for an ID token.
        if (!subject && input.code) {
          const requestBody = new FormData();
          requestBody.append("grant_type", "authorization_code");
          requestBody.append("client_id", authority.details.clientId);
          requestBody.append("client_secret", authority.details.clientSecret);
          requestBody.append("code", input.code);
          requestBody.append(
            "redirect_uri",
            `${base}?authorityId=${input.authorityId}`
          );

          const response = await fetch(authority.details.tokenUrl, {
            method: "POST",
            body: requestBody,
          });

          const responseBody = (await response.json()) as {
            access_token: string;
            id_token: string;
            expires_in: number;
            token_type: string;
            refresh_token?: string;
            error?: string;
          };

          if (!responseBody || !responseBody.id_token) {
            throw new Error(
              (responseBody && responseBody.error) ||
                "Invalid response returned by authority."
            );
          }

          // Decode the ID token.
          const token = jwt.decode(responseBody.id_token) as {
            sub: string;
            iss: string;
            azp?: string;
            aud: string;
            iat: number;
            exp: number;
            name?: string;
            given_name?: string;
            family_name?: string;
            middle_name?: string;
            nickname?: string;
            preferred_username?: string;
            profile?: string;
            picture?: string;
            website?: string;
            email?: string;
            email_verified?: boolean;
            gender?: string;
            birthdate?: string;
            zoneinfo?: string;
            locale?: string;
            phone_number?: string;
            phone_number_verified?: boolean;
            address?: {
              formatted?: string;
              street_address?: string;
              locality?: string;
              region?: string;
              postal_code?: string;
              country?: string;
            };
            updated_at?: number;

            // This is a google-specific claim for "hosted domain".
            hd?: string;
          };

          if (!token || typeof token.sub !== "string" || !token.sub) {
            throw new Error("Invalid token returned by authority.");
          }

          // Restrict user based to hosted domain.
          if (
            authority.details.restrictsAccountsToHostedDomains.length &&
            (!token.hd ||
              !authority.details.restrictsAccountsToHostedDomains.includes(
                token.hd
              ))
          ) {
            throw new AuthenticationError(
              `The hosted domain "${token.hd || ""}" is not allowed.`
            );
          }

          subject = token.sub;
        }

        if (!subject) {
          throw new Error("No subject was provided.");
        }

        // Check if the openid is used in a different credential
        const existingCredentials = await OpenIdCredential.read(
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
              [authority.id, subject]
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
        // the account with the OpenID provider.
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
          )) &&
          !input.code
        ) {
          throw new ForbiddenError(
            "You do not have permission to create this credential without passing a valid `code`."
          );
        }

        // Disable the conflicting credential
        if (existingCredentials.length === 1) {
          await OpenIdCredential.write(
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

        const credential = await OpenIdCredential.write(
          tx,
          {
            id,
            enabled: input.enabled,
            authorityId: input.authorityId,
            userId: input.userId,
            authorityUserId: subject,
            details: {},
          },
          {
            recordId: v4(),
            createdByAuthorizationId: a.id,
            createdAt: new Date(),
          }
        );

        const possibleAdministrationScopes =
          createV2CredentialAdministrationScopes(realm, {
            type: "credential",
            authorityId: credential.authorityId,
            credentialId: id,
            userId: credential.userId,
          });

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

        return credential;
      } catch (error) {
        await tx.query("ROLLBACK");
        throw error;
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
