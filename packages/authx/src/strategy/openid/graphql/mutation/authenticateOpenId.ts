import {
  GraphQLFieldConfig,
  GraphQLID,
  GraphQLNonNull,
  GraphQLString
} from "graphql";
import jwt from "jsonwebtoken";
import { randomBytes } from "crypto";
import v4 from "uuid/v4";
import fetch from "node-fetch";
import FormData from "form-data";

import { Context } from "../../../../Context";
import { GraphQLAuthorization } from "../../../../graphql";
import { Authority, Authorization, User, Role } from "../../../../model";
import { ForbiddenError, AuthenticationError } from "../../../../errors";
import { OpenIdAuthority, OpenIdCredential } from "../../model";
import { EmailAuthority } from "../../../email";

const __DEV__ = process.env.NODE_ENV !== "production";

export const authenticateOpenId: GraphQLFieldConfig<
  any,
  {
    authorityId: string;
    code: string;
  },
  Context
> = {
  type: GraphQLAuthorization,
  description: "Create a new authorization.",
  args: {
    authorityId: {
      type: new GraphQLNonNull(GraphQLID)
    },
    code: {
      type: new GraphQLNonNull(GraphQLString)
    }
  },
  async resolve(source, args, context): Promise<Authorization> {
    const {
      tx,
      authorization: a,
      realm,
      strategies: { authorityMap },
      base
    } = context;

    if (a) {
      throw new ForbiddenError("You area already authenticated.");
    }

    await tx.query("BEGIN DEFERRABLE");

    try {
      // Fetch the authority.
      const authority = await Authority.read(
        tx,
        args.authorityId,
        authorityMap
      );

      if (!(authority instanceof OpenIdAuthority)) {
        throw new AuthenticationError(
          __DEV__
            ? "The authority uses a strategy other than openid."
            : undefined
        );
      }

      // Fetch the ID token.
      const requestBody = new FormData();
      requestBody.append("grant_type", "authorization_code");
      requestBody.append("client_id", authority.details.clientId);
      requestBody.append("client_secret", authority.details.clientSecret);
      requestBody.append("code", args.code);
      requestBody.append(
        "redirect_uri",
        `${base}?authorityId=${args.authorityId}`
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

      if (!token) {
        throw new Error("Invalid token returned by authority.");
      }

      // Restrict user based to hosted domain.
      if (
        authority.details.restrictToHostedDomains.length &&
        (!token.hd ||
          !authority.details.restrictToHostedDomains.includes(token.hd))
      ) {
        throw new AuthenticationError(
          `The hosted domain "${token.hd || ""}" is not allowed.`
        );
      }

      const authorizationId = v4();

      // Get the credential
      let credential = await authority.credential(tx, token.sub);

      // Try to associate an existing user by email.
      if (
        !credential &&
        authority.details.emailAuthorityId &&
        authority.details.matchUsersByEmail &&
        token.email &&
        token.email_verified
      ) {
        const emailAuthority = await EmailAuthority.read(
          tx,
          authority.details.emailAuthorityId
        );

        const emailCredential =
          emailAuthority &&
          emailAuthority.enabled &&
          (await emailAuthority.credential(tx, token.email));

        if (emailCredential && emailCredential.enabled) {
          credential = await OpenIdCredential.write(
            tx,
            {
              enabled: true,
              id: v4(),
              userId: emailCredential.userId,
              authorityId: authority.id,
              authorityUserId: token.sub,
              details: {}
            },
            {
              recordId: v4(),
              createdByAuthorizationId: authorizationId,
              createdAt: new Date()
            }
          );
        }
      }

      // Create a new user.
      if (!credential && authority.details.createUnmatchedUsers) {
        const user = await User.write(
          tx,
          {
            id: v4(),
            enabled: true,
            type: "human",
            name: token.name || ""
          },
          {
            recordId: v4(),
            createdByAuthorizationId: authorizationId,
            createdAt: new Date()
          }
        );

        credential = await OpenIdCredential.write(
          tx,
          {
            enabled: true,
            id: v4(),
            userId: user.id,
            authorityId: authority.id,
            authorityUserId: token.sub,
            details: {}
          },
          {
            recordId: v4(),
            createdByAuthorizationId: authorizationId,
            createdAt: new Date()
          }
        );

        // Assign the new user to the configured roles.
        if (
          authority.details.assignCreatedUsersToRoleIds &&
          authority.details.assignCreatedUsersToRoleIds.length
        ) {
          const roles = await Promise.all(
            authority.details.assignCreatedUsersToRoleIds.map(id =>
              Role.read(tx, id)
            )
          );

          await roles.map(role =>
            Role.write(
              tx,
              {
                ...role,
                userIds: [...role.userIds, user.id]
              },
              {
                recordId: v4(),
                createdByAuthorizationId: authorizationId,
                createdAt: new Date()
              }
            )
          );
        }
      }

      if (!credential) {
        throw new AuthenticationError("No such credential exists.");
      }

      // Create a new authorization.
      const authorization = await Authorization.write(
        tx,
        {
          id: authorizationId,
          enabled: true,
          userId: credential.userId,
          grantId: null,
          secret: randomBytes(16).toString("hex"),
          scopes: [`${realm}:**:**`]
        },
        {
          recordId: v4(),
          createdByAuthorizationId: authorizationId,
          createdByCredentialId: credential.id,
          createdAt: new Date()
        }
      );

      await tx.query("COMMIT");

      // use this authorization for the rest of the request
      context.authorization = authorization;

      return authorization;
    } catch (error) {
      await tx.query("ROLLBACK");
      throw error;
    }
  }
};
