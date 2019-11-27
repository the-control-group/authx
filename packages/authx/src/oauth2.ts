import v4 from "uuid/v4";
import jwt from "jsonwebtoken";
import { randomBytes } from "crypto";
import { Context } from "./Context";
import { Client, Grant, Authorization } from "./model";
import { NotFoundError } from "./errors";
import { createV2AuthXScope } from "./util/scopes";
import { inject, isEqual, isValidScopeTemplate } from "@authx/scopes";
import { ParameterizedContext } from "koa";
import { PoolClient } from "pg";
import x from "./x";

async function assertPermissions(
  realm: string,
  tx: PoolClient,
  grant: Grant,
  values: { [key: string]: null | string }
): Promise<void> {
  if (
    // Check that we have every relevant user scope:
    !(await grant.can(
      tx,
      values,
      createV2AuthXScope(
        realm,
        {
          type: "user",
          userId: grant.userId
        },
        {
          basic: "r"
        }
      )
    )) ||
    // Check that we have every relevant grant scope:
    !(await grant.can(
      tx,
      values,
      createV2AuthXScope(
        realm,
        {
          type: "grant",
          clientId: grant.clientId,
          grantId: grant.id,
          userId: grant.userId
        },
        {
          basic: "*",
          scopes: "*",
          secrets: "*"
        }
      )
    )) ||
    // Check that we have every relevant authorization scope:
    !(await grant.can(
      tx,
      values,
      createV2AuthXScope(
        realm,
        {
          type: "authorization",
          authorizationId: "*",
          clientId: grant.clientId,
          grantId: grant.id,
          userId: grant.userId
        },
        {
          basic: "*",
          scopes: "*",
          secrets: "*"
        }
      )
    ))
  ) {
    throw new OAuthError(
      "invalid_grant",
      "The grant contains insufficient permission for OAuth."
    );
  }
}

class OAuthError extends Error {
  public code: string;
  public uri: null | string;

  public constructor(code: string, message?: string, uri?: string) {
    super(typeof message === "undefined" ? code : message);
    this.code = code;
    this.uri = uri || null;
  }
}

// Loop through an iterable of grant secrets and select the secret that was most
// recently issued
function getRefreshToken(secrets: Iterable<string>): null | string {
  let refreshToken = null;
  let max = 0;
  for (const secret of secrets) {
    const issuedString = Buffer.from(secret, "base64")
      .toString("utf8")
      .split(":")[1];

    const issuedNumber = parseInt(issuedString);
    if (issuedString && issuedNumber && issuedNumber > max) {
      refreshToken = secret;
      max = issuedNumber;
    }
  }

  return refreshToken;
}

export default async (
  ctx: ParameterizedContext<any, { [x]: Context }>
): Promise<void> => {
  ctx.response.set("Cache-Control", "no-store");
  ctx.response.set("Pragma", "no-cache");

  const {
    pool,
    realm,
    jwtValidityDuration,
    codeValidityDuration,
    privateKey
  } = ctx[x];

  try {
    const tx = await pool.connect();
    try {
      // Make sure the body is an object.
      const request: {
        grant_type?: unknown;
        client_id?: unknown;
        client_secret?: unknown;
        code?: unknown;
        nonce?: unknown;
        refresh_token?: unknown;
        scope?: unknown;
      } = (ctx.request as any).body;
      if (!request || typeof request !== "object") {
        throw new OAuthError("invalid_request");
      }

      const grantType: undefined | string =
        typeof request.grant_type === "string" ? request.grant_type : undefined;

      // Authorization Code
      // ==================
      if (grantType === "authorization_code") {
        try {
          tx.query("BEGIN DEFERRABLE");
          const now = Math.floor(Date.now() / 1000);
          const paramsClientId: undefined | string =
            typeof request.client_id === "string"
              ? request.client_id
              : undefined;
          const paramsClientSecret: undefined | string =
            typeof request.client_secret === "string"
              ? request.client_secret
              : undefined;
          const paramsCode: undefined | string =
            typeof request.code === "string" ? request.code : undefined;
          const paramsNonce: undefined | string =
            typeof request.nonce === "string" ? request.nonce : undefined;

          if (!paramsClientId || !paramsClientSecret || !paramsCode) {
            throw new OAuthError("invalid_request");
          }

          // Authenticate the client with its secret.
          let client;
          try {
            client = await Client.read(tx, paramsClientId);
          } catch (error) {
            if (!(error instanceof NotFoundError)) throw error;
            throw new OAuthError("invalid_client");
          }

          if (!client.secrets.has(paramsClientSecret)) {
            throw new OAuthError("invalid_client");
          }

          if (!client.enabled) {
            throw new OAuthError("unauthorized_client");
          }

          // Decode and validate the authorization code.
          const [grantId, issuedAt, nonce] = Buffer.from(paramsCode, "base64")
            .toString("utf8")
            .split(":");

          if (!grantId || !issuedAt || !nonce) {
            throw new OAuthError(
              "invalid_grant",
              "The authorization code is malformed."
            );
          }

          if (parseInt(issuedAt, 10) + codeValidityDuration < now) {
            throw new OAuthError(
              "invalid_grant",
              "The authorization code is expired."
            );
          }

          // Fetch the grant.
          let grant;
          try {
            grant = await Grant.read(tx, grantId);
          } catch (error) {
            if (!(error instanceof NotFoundError)) throw error;
            throw new OAuthError(
              "invalid_grant",
              "The authorization code is invalid."
            );
          }

          if (!grant.enabled) {
            throw new OAuthError(
              "invalid_grant",
              "The authorization code is invalid."
            );
          }

          if (!grant.codes.has(paramsCode)) {
            throw new OAuthError(
              "invalid_grant",
              "The authorization code is invalid."
            );
          }

          // Fetch the user.
          const user = await grant.user(tx);
          if (!user.enabled) {
            throw new OAuthError(
              "invalid_grant",
              "The authorization code is invalid."
            );
          }

          const requestedScopes = grant.scopes;

          const values: { [name: string]: null | string } = {
            /* eslint-disable @typescript-eslint/camelcase */
            current_user_id: grant.userId,
            current_grant_id: grant.id,
            current_authorization_id: null
            /* eslint-enable @typescript-eslint/camelcase */
          };

          // Make sure we have the necessary access.
          await assertPermissions(realm, tx, grant, values);

          // Look for an existing active authorization for this grant with the
          // same scopes
          const authorizations = (await grant.authorizations(tx)).filter(
            t => t.enabled && isEqual(requestedScopes, t.scopes)
          );

          let authorization: Authorization;

          if (authorizations.length) {
            // Use an existing authorization.
            authorization = authorizations[0];
          } else {
            // Create a new authorization.
            const authorizationId = v4();
            authorization = await Authorization.write(
              tx,
              {
                id: authorizationId,
                enabled: true,
                userId: user.id,
                grantId: grant.id,
                secret: randomBytes(16).toString("hex"),
                scopes: requestedScopes
              },
              {
                recordId: v4(),
                createdByAuthorizationId: authorizationId,
                createdByCredentialId: null,
                createdAt: new Date()
              }
            );
          }

          // Remove the authorization code we used, and prune any others that have
          // expired.
          const codes = [...grant.codes].filter(code => {
            const issued = Buffer.from(code, "base64")
              .toString("utf8")
              .split(":")[1];
            return (
              code !== paramsCode &&
              issued &&
              parseInt(issued) + codeValidityDuration > now
            );
          });

          grant = await Grant.write(
            tx,
            {
              ...grant,
              codes
            },
            {
              recordId: v4(),
              createdByAuthorizationId: authorization.id,
              createdAt: new Date()
            }
          );

          const body = {
            /* eslint-disable @typescript-eslint/camelcase */
            token_type: "bearer",
            access_token: jwt.sign(
              {
                aid: authorization.id,
                scopes: await authorization.access(tx, values),
                nonce: paramsNonce
              },
              privateKey,
              {
                algorithm: "RS512",
                expiresIn: jwtValidityDuration,
                audience: client.id,
                subject: user.id,
                issuer: realm
              }
            ),
            refresh_token: getRefreshToken(grant.secrets),
            expires_in: jwtValidityDuration,
            scope: (await authorization.access(tx, values)).join(" ")
            /* eslint-enable @typescript-eslint/camelcase */
          };

          await tx.query("COMMIT");
          ctx.response.body = body;
          return;
        } catch (error) {
          await tx.query("ROLLBACK");
          throw error;
        }
      }

      // Refresh Token
      // =============
      if (grantType === "refresh_token") {
        try {
          tx.query("BEGIN DEFERRABLE");
          const paramsClientId: undefined | string =
            typeof request.client_id === "string"
              ? request.client_id
              : undefined;
          const paramsClientSecret: undefined | string =
            typeof request.client_secret === "string"
              ? request.client_secret
              : undefined;
          const paramsRefreshToken: undefined | string =
            typeof request.refresh_token === "string"
              ? request.refresh_token
              : undefined;
          const paramsScope: undefined | string =
            typeof request.scope === "string" ? request.scope : undefined;
          const paramsNonce: undefined | string =
            typeof request.nonce === "string" ? request.nonce : undefined;
          if (!paramsClientId || !paramsClientSecret || !paramsRefreshToken) {
            throw new OAuthError("invalid_request");
          }

          const requestedScopeTemplates = paramsScope
            ? paramsScope.split(" ")
            : [];
          if (
            paramsScope &&
            !requestedScopeTemplates.every(isValidScopeTemplate)
          ) {
            throw new OAuthError("invalid_scope");
          }

          // Authenticate the client with its secret.
          let client;
          try {
            client = await Client.read(tx, paramsClientId);
          } catch (error) {
            if (!(error instanceof NotFoundError)) throw error;
            throw new OAuthError("invalid_client");
          }

          if (!client.secrets.has(paramsClientSecret)) {
            throw new OAuthError("invalid_client");
          }

          if (!client.enabled) {
            throw new OAuthError("unauthorized_client");
          }

          // Decode and validate the authorization code.
          const [grantId, issuedAt, nonce] = Buffer.from(
            paramsRefreshToken,
            "base64"
          )
            .toString("utf8")
            .split(":");

          if (!grantId || !issuedAt || !nonce) {
            throw new OAuthError(
              "invalid_grant",
              "Invalid authorization code."
            );
          }

          // Fetch the grant.
          let grant: Grant;
          try {
            grant = await Grant.read(tx, grantId);
          } catch (error) {
            if (!(error instanceof NotFoundError)) throw error;
            throw new OAuthError(
              "invalid_grant",
              "Invalid authorization code."
            );
          }

          if (!grant.enabled) {
            throw new OAuthError(
              "invalid_grant",
              "Invalid authorization code."
            );
          }

          if (!grant.secrets.has(paramsRefreshToken)) {
            throw new OAuthError(
              "invalid_grant",
              "Invalid authorization code."
            );
          }

          // Fetch the user.
          const user = await grant.user(tx);
          if (!user.enabled) {
            throw new OAuthError(
              "invalid_grant",
              "Invalid authorization code."
            );
          }

          // Make sure we have the necessary access.
          await assertPermissions(realm, tx, grant, {
            /* eslint-disable @typescript-eslint/camelcase */
            current_user_id: grant.userId,
            current_grant_id: grant.id,
            current_authorization_id: null
            /* eslint-enable @typescript-eslint/camelcase */
          });

          // Look for an existing active authorization for this grant with the same scopes
          const authorizations = (await grant.authorizations(tx)).filter(
            t =>
              t.enabled &&
              isEqual(
                inject(requestedScopeTemplates, {
                  /* eslint-disable @typescript-eslint/camelcase */
                  current_user_id: grant.userId,
                  current_grant_id: grant.id,
                  current_authorization_id: t.id
                  /* eslint-enable @typescript-eslint/camelcase */
                }),
                t.scopes
              )
          );

          let authorization: Authorization;

          if (authorizations.length) {
            // Use an existing authorization.
            authorization = authorizations[0];
          } else {
            // Create a new authorization.
            const authorizationId = v4();
            authorization = await Authorization.write(
              tx,
              {
                id: authorizationId,
                enabled: true,
                userId: user.id,
                grantId: grant.id,
                secret: randomBytes(16).toString("hex"),
                scopes: inject(requestedScopeTemplates, {
                  /* eslint-disable @typescript-eslint/camelcase */
                  current_user_id: grant.userId,
                  current_grant_id: grant.id,
                  current_authorization_id: authorizationId
                  /* eslint-enable @typescript-eslint/camelcase */
                })
              },
              {
                recordId: v4(),
                createdByAuthorizationId: authorizationId,
                createdByCredentialId: null,
                createdAt: new Date()
              }
            );
          }

          const scopes = await authorization.access(tx, {
            /* eslint-disable @typescript-eslint/camelcase */
            current_user_id: grant.userId,
            current_grant_id: grant.id,
            current_authorization_id: authorization.id
            /* eslint-enabme @typescript-eslint/camelcase */
          });

          const body = {
            /* eslint-disable @typescript-eslint/camelcase */
            token_type: "bearer",
            access_token: jwt.sign(
              {
                aid: authorization.id,
                scopes,
                nonce: paramsNonce
              },
              privateKey,
              {
                algorithm: "RS512",
                expiresIn: jwtValidityDuration,
                audience: client.id,
                subject: user.id,
                issuer: realm
              }
            ),
            refresh_token: getRefreshToken(grant.secrets),
            expires_in: 3600,
            scope: scopes.join(" ")
            /* eslint-enabme @typescript-eslint/camelcase */
          };

          await tx.query("COMMIT");
          ctx.response.body = body;
          return;
        } catch (error) {
          await tx.query("ROLLBACK");
          throw error;
        }
      }

      // Unsupported Grant Type
      throw new OAuthError("unsupported_grant_type");
    } finally {
      tx.release();
    }
  } catch (error) {
    if (!(error instanceof OAuthError)) throw error;
    const body: {
      error: string;
      error_message?: string;
      error_uri?: string;
    } = { error: error.code };

    if (error.message !== error.code) {
      // eslint-disable-next-line @typescript-eslint/camelcase
      body.error_message = error.message;
    }

    if (error.uri) {
      // eslint-disable-next-line @typescript-eslint/camelcase
      body.error_uri = error.uri;
    }

    ctx.response.body = body;
    ctx.app.emit("error", error);
  }
};
