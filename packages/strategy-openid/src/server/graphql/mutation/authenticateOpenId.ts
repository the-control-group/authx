import {
  GraphQLFieldConfig,
  GraphQLID,
  GraphQLNonNull,
  GraphQLString
} from "graphql";

import { Pool, PoolClient } from "pg";
import jwt from "jsonwebtoken";
import { randomBytes } from "crypto";
import { v4 } from "uuid";
import fetch from "node-fetch";
import FormData from "form-data";

import {
  Context,
  GraphQLAuthorization,
  Authority,
  Authorization,
  User,
  Role,
  ForbiddenError,
  AuthenticationError,
  DataLoaderExecutor,
  ReadonlyDataLoaderExecutor
} from "@authx/authx";

import { createV2AuthXScope } from "@authx/authx/scopes";

import { isSuperset } from "@authx/scopes";
import { EmailAuthority } from "@authx/strategy-email";
import { OpenIdAuthority, OpenIdCredential } from "../../model";

export const authenticateOpenId: GraphQLFieldConfig<
  any,
  Context,
  {
    authorityId: string;
    code: string;
  }
> = {
  type: GraphQLAuthorization,
  description: "Create a new authorization.",
  args: {
    authorityId: {
      type: new GraphQLNonNull(GraphQLID)
    },
    code: {
      type: new GraphQLNonNull(GraphQLString),
      description:
        "The OAuth authorization code provided by the OpenID exchange."
    }
  },
  async resolve(source, args, context): Promise<Authorization> {
    const { executor, authorization: a, realm, base } = context;

    if (a) {
      throw new ForbiddenError("You area already authenticated.");
    }

    const strategies = executor.strategies;
    const pool = executor.connection;
    if (!(pool instanceof Pool)) {
      throw new Error(
        "INVARIANT: The executor connection is expected to be an instance of Pool."
      );
    }

    const tx = await pool.connect();
    try {
      // Make sure this transaction is used for queries made by the executor.
      const executor = new DataLoaderExecutor<Pool | PoolClient>(
        tx,
        strategies
      );

      await tx.query("BEGIN DEFERRABLE");

      // Fetch the authority.
      const authority = await Authority.read(tx, args.authorityId, strategies);

      if (!(authority instanceof OpenIdAuthority)) {
        throw new AuthenticationError(
          "The authority uses a strategy other than openid."
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

      const authorizationId = v4();

      // Get the credential
      let credential = await authority.credential(executor, token.sub);

      // Try to associate an existing user by email.
      if (
        !credential &&
        authority.details.emailAuthorityId &&
        authority.details.matchesUsersByEmail &&
        token.email &&
        token.email_verified
      ) {
        const emailAuthority = await EmailAuthority.read(
          executor,
          authority.details.emailAuthorityId
        );

        const emailCredential =
          emailAuthority &&
          emailAuthority.enabled &&
          (await emailAuthority.credential(executor, token.email));

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
      if (!credential && authority.details.createsUnmatchedUsers) {
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
          authority.details.assignsCreatedUsersToRoleIds &&
          authority.details.assignsCreatedUsersToRoleIds.length
        ) {
          const roles = await Promise.all(
            authority.details.assignsCreatedUsersToRoleIds.map(id =>
              Role.read(executor, id)
            )
          );

          const roleResults = await Promise.allSettled(
            roles.map(role =>
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
            )
          );

          for (const result of roleResults) {
            if (result.status === "rejected") {
              throw new Error(result.reason);
            }
          }
        }
      }

      if (!credential) {
        throw new AuthenticationError("No such credential exists.");
      }

      // Invoke the credential.
      await credential.invoke(executor, {
        id: v4(),
        createdAt: new Date()
      });

      const values = {
        currentAuthorizationId: authorizationId,
        currentUserId: credential.userId,
        currentGrantId: null,
        currentClientId: null
      };

      // Make sure the user can create new authorizations.
      const user = await User.read(executor, credential.userId);
      if (
        !isSuperset(
          await user.access(executor, values),
          createV2AuthXScope(
            realm,
            {
              type: "authorization",
              authorizationId: "",
              grantId: "",
              clientId: "",
              userId: user.id
            },
            {
              basic: "*",
              scopes: "*",
              secrets: "*"
            }
          )
        )
      ) {
        throw new ForbiddenError(
          "You do not have permission to create this authorization"
        );
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

      // Invoke the new authorization, since it will be used for the remainder
      // of the request.
      await authorization.invoke(executor, {
        id: v4(),
        format: "basic",
        createdAt: new Date()
      });

      await tx.query("COMMIT");

      // Clear and prime the loader.
      Authorization.clear(executor, authorization.id);
      Authorization.prime(executor, authorization.id, authorization);

      // Update the context to use a new executor primed with the results of
      // this mutation, using the original connection pool.
      executor.connection = pool;
      context.executor = executor as ReadonlyDataLoaderExecutor<Pool>;

      // Use this authorization for the rest of the request.
      context.authorization = authorization;

      return authorization;
    } catch (error) {
      await tx.query("ROLLBACK");
      throw error;
    } finally {
      tx.release();
    }
  }
};
