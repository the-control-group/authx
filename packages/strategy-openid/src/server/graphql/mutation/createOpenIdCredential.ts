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
  AuthenticationError
} from "@authx/authx";
import { OpenIdCredential, OpenIdAuthority } from "../../model";
import { GraphQLOpenIdCredential } from "../GraphQLOpenIdCredential";
import { GraphQLCreateOpenIdCredentialInput } from "./GraphQLCreateOpenIdCredentialInput";

export const createOpenIdCredential: GraphQLFieldConfig<
  any,
  {
    credentials: {
      enabled: boolean;
      userId: string;
      authorityId: string;
      code: null | string;
      subject: null | string;
    }[];
  },
  Context
> = {
  type: GraphQLOpenIdCredential,
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
      const tx = await pool.connect();
      try {
        await tx.query("BEGIN DEFERRABLE");

        const id = v4();

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

        const data = new OpenIdCredential({
          id,
          enabled: input.enabled,
          authorityId: input.authorityId,
          userId: input.userId,
          authorityUserId: subject,
          details: {}
        });

        // Check if the openid is used in a different credential
        const existingCredentials = await OpenIdCredential.read(
          tx,
          (await tx.query(
            `
          SELECT entity_id as id
          FROM authx.credential_record
          WHERE
            replacement_record_id IS NULL
            AND enabled = TRUE
            AND authority_id = $1
            AND authority_user_id = $2
          `,
            [authority.id, data.authorityUserId]
          )).rows.map(({ id }) => id)
        );

        if (existingCredentials.length > 1) {
          throw new Error(
            "INVARIANT: There cannot be more than one active credential with the same authorityId and authorityUserId."
          );
        }

        if (!(await a.can(tx, `${realm}:credential.user.*.*:write.*`))) {
          if (!(await data.isAccessibleBy(realm, a, tx, "write.*"))) {
            throw new ForbiddenError(
              "You do not have permission to create this credential."
            );
          }

          // The user doesn't have permission to change the credentials of all
          // users, so in order to save this credential, she must prove control of
          // the account with the OpenID provider.
          if (!input.code) {
            throw new ForbiddenError(
              "You do not have permission to create this credential without passing a valid `code`."
            );
          }
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

        const credential = await OpenIdCredential.write(tx, data, {
          recordId: v4(),
          createdByAuthorizationId: a.id,
          createdAt: new Date()
        });

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
