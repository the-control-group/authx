import v4 from "uuid/v4";
import fetch from "node-fetch";
import FormData from "form-data";
import jwt from "jsonwebtoken";
import { GraphQLFieldConfig, GraphQLNonNull, GraphQLList } from "graphql";

import {
  Context,
  Authority,
  ForbiddenError,
  NotFoundError,
  ValidationError,
  ConflictError,
  AuthenticationError,
  Role,
  validateIdFormat
} from "@authx/authx";

import { createV2AuthXScope } from "@authx/authx/scopes";

import { isSuperset, simplify, isValidScopeLiteral } from "@authx/scopes";
import { OpenIdCredential, OpenIdAuthority } from "../../model";
import { GraphQLOpenIdCredential } from "../GraphQLOpenIdCredential";
import { GraphQLCreateOpenIdCredentialInput } from "./GraphQLCreateOpenIdCredentialInput";

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
      )
    }
  },
  async resolve(source, args, context): Promise<Promise<OpenIdCredential>[]> {
    const {
      pool,
      authorization: a,
      realm,
      strategies: { authorityMap },
      base
    } = context;

    if (!a) {
      throw new ForbiddenError(
        "You must be authenticated to create a credential."
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
        await tx.query("BEGIN DEFERRABLE");

        const values = {
          currentAuthorizationId: a.id,
          currentUserId: a.userId,
          currentGrantId: a.grantId,
          currentClientId: (await a.grant(tx))?.clientId ?? null
        };

        // Make sure the ID isn't already in use.
        if (input.id) {
          try {
            await OpenIdCredential.read(tx, input.id, { forUpdate: true });
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
          authorityMap
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
            body: requestBody
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
          tx,
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
            tx,
            values,
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

        // The user doesn't have permission to change the credentials of all
        // users, so in order to save this credential, she must prove control of
        // the account with the OpenID provider.
        if (
          !(await a.can(
            tx,
            values,
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
              enabled: false
            },
            {
              recordId: v4(),
              createdByAuthorizationId: a.id,
              createdAt: new Date()
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
            details: {}
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
              type: "credential",
              authorityId: credential.authorityId,
              credentialId: id,
              userId: credential.userId
            },
            {
              basic: "r",
              details: ""
            }
          ),
          createV2AuthXScope(
            realm,
            {
              type: "credential",
              authorityId: credential.authorityId,
              credentialId: id,
              userId: credential.userId
            },
            {
              basic: "r",
              details: "r"
            }
          ),
          createV2AuthXScope(
            realm,
            {
              type: "credential",
              authorityId: credential.authorityId,
              credentialId: id,
              userId: credential.userId
            },
            {
              basic: "r",
              details: "*"
            }
          ),
          createV2AuthXScope(
            realm,
            {
              type: "credential",
              authorityId: credential.authorityId,
              credentialId: id,
              userId: credential.userId
            },
            {
              basic: "w",
              details: ""
            }
          ),
          createV2AuthXScope(
            realm,
            {
              type: "credential",
              authorityId: credential.authorityId,
              credentialId: id,
              userId: credential.userId
            },
            {
              basic: "w",
              details: "w"
            }
          ),
          createV2AuthXScope(
            realm,
            {
              type: "credential",
              authorityId: credential.authorityId,
              credentialId: id,
              userId: credential.userId
            },
            {
              basic: "w",
              details: "*"
            }
          ),
          createV2AuthXScope(
            realm,
            {
              type: "credential",
              authorityId: credential.authorityId,
              credentialId: id,
              userId: credential.userId
            },
            {
              basic: "*",
              details: "*"
            }
          )
        ];

        // Add administration scopes.
        for (const { roleId, scopes } of input.administration) {
          const role = await Role.read(tx, roleId, { forUpdate: true });

          if (
            !role.isAccessibleBy(realm, a, tx, {
              basic: "w",
              scopes: "w",
              users: ""
            })
          ) {
            throw new ForbiddenError(
              `You do not have permission to modify the scopes of role ${roleId}.`
            );
          }

          await Role.write(
            tx,
            {
              ...role,
              scopes: simplify([
                ...role.scopes,
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
        }

        await tx.query("COMMIT");
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
