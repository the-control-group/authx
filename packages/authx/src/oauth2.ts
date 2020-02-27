import { v4 } from "uuid";
import jwt from "jsonwebtoken";
import { randomBytes } from "crypto";
import { Context } from "./Context";
import { Client, Grant, Authorization } from "./model";
import { NotFoundError } from "./errors";
import { createV2AuthXScope } from "./util/scopes";
import { inject, isEqual, isValidScopeTemplate } from "@authx/scopes";
import { Context as KoaContext } from "koa";
import { ClientBase } from "pg";
import x from "./x";

async function assertPermissions(
  realm: string,
  tx: ClientBase,
  grant: Grant,
  values: {
    currentUserId: string | null;
    currentGrantId: string | null;
    currentClientId: string | null;
    currentAuthorizationId: string | null;
  }
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
          basic: "r",
          scopes: "",
          secrets: ""
        }
      )
    )) ||
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
          basic: "r",
          scopes: "",
          secrets: "r"
        }
      )
    )) ||
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
          basic: "r",
          scopes: "r",
          secrets: ""
        }
      )
    )) ||
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
          basic: "w",
          scopes: "",
          secrets: "w"
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
          basic: "r",
          scopes: "",
          secrets: ""
        }
      )
    )) ||
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
          basic: "r",
          scopes: "r",
          secrets: ""
        }
      )
    )) ||
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
          basic: "r",
          scopes: "",
          secrets: "r"
        }
      )
    )) ||
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
          basic: "w",
          scopes: "",
          secrets: ""
        }
      )
    )) ||
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
          basic: "w",
          scopes: "w",
          secrets: ""
        }
      )
    )) ||
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
          basic: "w",
          scopes: "",
          secrets: "w"
        }
      )
    ))
  ) {
    throw new OAuthError(
      "invalid_grant",
      "The grant contains insufficient permission for OAuth.",
      undefined,
      grant.clientId,
      403
    );
  }
}

class OAuthError extends Error {
  public code: string;
  public uri: null | string;
  public clientId?: string;
  public statusCode: number;

  public constructor(
    code: string,
    message?: string,
    uri?: string,
    clientId?: string,
    statusCode: number = 400
  ) {
    super(typeof message === "undefined" ? code : message);
    this.code = code;
    this.uri = uri || null;
    this.clientId = clientId;
    this.statusCode = statusCode;
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

async function oAuth2Middleware(
  ctx: KoaContext & { [x]: Context }
): Promise<void> {
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
        throw new OAuthError(
          "invalid_request",
          "The request body must be a JSON object."
        );
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
            throw new OAuthError(
              "invalid_request",
              "The request body must include fields `client_id`, `client_secret`, and `code`.",
              undefined,
              paramsClientId
            );
          }

          // Authenticate the client with its secret.
          let client;
          try {
            client = await Client.read(tx, paramsClientId);
          } catch (error) {
            if (!(error instanceof NotFoundError)) throw error;
            throw new OAuthError(
              "invalid_client",
              undefined,
              undefined,
              paramsClientId
            );
          }

          if (!client.secrets.has(paramsClientSecret)) {
            throw new OAuthError(
              "invalid_client",
              undefined,
              undefined,
              paramsClientId
            );
          }

          if (!client.enabled) {
            throw new OAuthError(
              "unauthorized_client",
              undefined,
              undefined,
              paramsClientId
            );
          }

          // Invoke the client.
          await client.invoke(tx, {
            id: v4(),
            createdAt: new Date()
          });

          // Decode and validate the authorization code.
          const [grantId, issuedAt, nonce] = Buffer.from(paramsCode, "base64")
            .toString("utf8")
            .split(":");

          if (!grantId || !issuedAt || !nonce) {
            throw new OAuthError(
              "invalid_grant",
              "The authorization code is malformed.",
              undefined,
              paramsClientId
            );
          }

          if (parseInt(issuedAt, 10) + codeValidityDuration < now) {
            throw new OAuthError(
              "invalid_grant",
              "The authorization code is expired.",
              undefined,
              paramsClientId
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
              "The authorization code is invalid.",
              undefined,
              paramsClientId
            );
          }

          if (!grant.enabled) {
            throw new OAuthError(
              "invalid_grant",
              "The authorization code is invalid.",
              undefined,
              paramsClientId
            );
          }

          if (!grant.codes.has(paramsCode)) {
            throw new OAuthError(
              "invalid_grant",
              "The authorization code is invalid.",
              undefined,
              paramsClientId
            );
          }

          // Invoke the grant.
          await grant.invoke(tx, {
            id: v4(),
            createdAt: new Date()
          });

          // Fetch the user.
          const user = await grant.user(tx);
          if (!user.enabled) {
            throw new OAuthError(
              "invalid_grant",
              "The authorization code is invalid.",
              undefined,
              paramsClientId
            );
          }

          const requestedScopes = grant.scopes;

          const values = {
            currentUserId: grant.userId,
            currentGrantId: grant.id,
            currentClientId: grant.clientId,
            currentAuthorizationId: null
          };

          // Make sure we have the necessary access.
          await assertPermissions(realm, tx, grant, values);

          // Get all enabled authorizations of this grant.
          const authorizations = (await grant.authorizations(tx)).filter(
            t => t.enabled
          );

          // Look for an existing active authorization for this grant with all
          // grant scopes.
          const possibleRootAuthorizations = authorizations.filter(t =>
            isEqual("**:**:**", t.scopes)
          );

          let rootAuthorization: Authorization;
          if (possibleRootAuthorizations.length) {
            // Use an existing authorization.
            ctx[x].authorization = rootAuthorization =
              possibleRootAuthorizations[0];
          } else {
            // Create a new authorization.
            const authorizationId = v4();
            ctx[
              x
            ].authorization = rootAuthorization = await Authorization.write(
              tx,
              {
                id: authorizationId,
                enabled: true,
                userId: user.id,
                grantId: grant.id,
                secret: randomBytes(16).toString("hex"),
                scopes: ["**:**:**"]
              },
              {
                recordId: v4(),
                createdByAuthorizationId: authorizationId,
                createdByCredentialId: null,
                createdAt: new Date()
              }
            );
          }

          // Look for an existing active authorization for this grant with the
          // requested scopes.
          const possibleRequestedAuthorizations = authorizations.filter(t =>
            isEqual(requestedScopes, t.scopes)
          );

          let requestedAuthorization: Authorization;
          if (possibleRequestedAuthorizations.length) {
            // Use an existing authorization.
            requestedAuthorization = possibleRequestedAuthorizations[0];
          } else {
            // Create a new authorization.
            requestedAuthorization = await Authorization.write(
              tx,
              {
                id: v4(),
                enabled: true,
                userId: user.id,
                grantId: grant.id,
                secret: randomBytes(16).toString("hex"),
                scopes: requestedScopes
              },
              {
                recordId: v4(),
                createdByAuthorizationId: rootAuthorization.id,
                createdByCredentialId: null,
                createdAt: new Date()
              }
            );
          }

          // Remove the authorization code we used, and prune any others that
          // have expired.
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
              createdByAuthorizationId: rootAuthorization.id,
              createdAt: new Date()
            }
          );

          const scopes = await requestedAuthorization.access(tx);
          const tokenId = v4();
          await requestedAuthorization.invoke(tx, {
            id: tokenId,
            format: "bearer",
            createdAt: new Date()
          });

          const body = {
            /* eslint-disable @typescript-eslint/camelcase */
            token_type: "bearer",
            access_token: jwt.sign(
              {
                aid: requestedAuthorization.id,
                scopes,
                nonce: paramsNonce
              },
              privateKey,
              {
                jwtid: tokenId,
                algorithm: "RS512",
                expiresIn: jwtValidityDuration,
                audience: client.id,
                subject: user.id,
                issuer: realm
              }
            ),
            refresh_token: getRefreshToken(grant.secrets),
            expires_in: jwtValidityDuration,
            scope: scopes.join(" ")
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
            throw new OAuthError(
              "invalid_request",
              "The request body must include fields `client_id`, `client_secret`, and `refresh_token`.",
              undefined,
              paramsClientId
            );
          }

          const requestedScopeTemplates = paramsScope
            ? paramsScope.split(" ")
            : [];
          if (
            paramsScope &&
            !requestedScopeTemplates.every(isValidScopeTemplate)
          ) {
            throw new OAuthError(
              "invalid_scope",
              undefined,
              undefined,
              paramsClientId
            );
          }

          // Authenticate the client with its secret.
          let client;
          try {
            client = await Client.read(tx, paramsClientId);
          } catch (error) {
            if (!(error instanceof NotFoundError)) throw error;
            throw new OAuthError(
              "invalid_client",
              undefined,
              undefined,
              paramsClientId
            );
          }

          if (!client.secrets.has(paramsClientSecret)) {
            throw new OAuthError(
              "invalid_client",
              undefined,
              undefined,
              paramsClientId
            );
          }

          if (!client.enabled) {
            throw new OAuthError(
              "unauthorized_client",
              undefined,
              undefined,
              paramsClientId
            );
          }

          // Invoke the client.
          await client.invoke(tx, {
            id: v4(),
            createdAt: new Date()
          });

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
              "Invalid authorization code.",
              undefined,
              paramsClientId
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
              "Invalid authorization code.",
              undefined,
              paramsClientId
            );
          }

          if (!grant.enabled) {
            throw new OAuthError(
              "invalid_grant",
              "Invalid authorization code.",
              undefined,
              paramsClientId
            );
          }

          if (grant.clientId !== client.id) {
            throw new OAuthError(
              "invalid_grant",
              "Invalid authorization code.",
              undefined,
              paramsClientId
            );
          }

          if (!grant.secrets.has(paramsRefreshToken)) {
            throw new OAuthError(
              "invalid_grant",
              "Invalid authorization code.",
              undefined,
              paramsClientId
            );
          }

          // Invoke the grant.
          await grant.invoke(tx, {
            id: v4(),
            createdAt: new Date()
          });

          // Fetch the user.
          const user = await grant.user(tx);
          if (!user.enabled) {
            throw new OAuthError(
              "invalid_grant",
              "Invalid authorization code.",
              undefined,
              paramsClientId
            );
          }

          // Make sure we have the necessary access.
          await assertPermissions(realm, tx, grant, {
            currentUserId: grant.userId,
            currentGrantId: grant.id,
            currentClientId: grant.clientId,
            currentAuthorizationId: null
          });

          // Get all enabled authorizations of this grant.
          const authorizations = (await grant.authorizations(tx)).filter(
            t => t.enabled
          );

          // Look for an existing active authorization for this grant with all
          // grant scopes.
          const possibleRootAuthorizations = authorizations.filter(t =>
            isEqual("**:**:**", t.scopes)
          );

          let rootAuthorization: Authorization;
          if (possibleRootAuthorizations.length) {
            // Use an existing authorization.
            ctx[x].authorization = rootAuthorization =
              possibleRootAuthorizations[0];
          } else {
            // Create a new authorization.
            const authorizationId = v4();
            ctx[
              x
            ].authorization = rootAuthorization = await Authorization.write(
              tx,
              {
                id: authorizationId,
                enabled: true,
                userId: user.id,
                grantId: grant.id,
                secret: randomBytes(16).toString("hex"),
                scopes: ["**:**:**"]
              },
              {
                recordId: v4(),
                createdByAuthorizationId: authorizationId,
                createdByCredentialId: null,
                createdAt: new Date()
              }
            );
          }

          // Look for an existing active authorization for this grant with the
          // requested scopes.
          const possibleRequestedAuthorizations = authorizations.filter(t =>
            isEqual(
              inject(requestedScopeTemplates, {
                /* eslint-disable @typescript-eslint/camelcase */
                current_user_id: grant.userId ?? null,
                current_grant_id: grant.id ?? null,
                current_client_id: grant.clientId ?? null,
                current_authorization_id: t.id ?? null
                /* eslint-enable @typescript-eslint/camelcase */
              }),
              t.scopes
            )
          );

          let requestedAuthorization: Authorization;

          if (possibleRequestedAuthorizations.length) {
            // Use an existing authorization.
            requestedAuthorization = possibleRequestedAuthorizations[0];
          } else {
            // Create a new authorization.
            const authorizationId = v4();
            requestedAuthorization = await Authorization.write(
              tx,
              {
                id: authorizationId,
                enabled: true,
                userId: user.id,
                grantId: grant.id,
                secret: randomBytes(16).toString("hex"),
                scopes: inject(requestedScopeTemplates, {
                  /* eslint-disable @typescript-eslint/camelcase */
                  current_user_id: grant.userId ?? null,
                  current_grant_id: grant.id ?? null,
                  current_client_id: grant.clientId ?? null,
                  current_authorization_id: authorizationId ?? null
                  /* eslint-enable @typescript-eslint/camelcase */
                })
              },
              {
                recordId: v4(),
                createdByAuthorizationId: rootAuthorization.id,
                createdByCredentialId: null,
                createdAt: new Date()
              }
            );
          }

          const scopes = await requestedAuthorization.access(tx);

          const tokenId = v4();
          await requestedAuthorization.invoke(tx, {
            id: tokenId,
            format: "bearer",
            createdAt: new Date()
          });

          const body = {
            /* eslint-disable @typescript-eslint/camelcase */
            token_type: "bearer",
            access_token: jwt.sign(
              {
                aid: requestedAuthorization.id,
                scopes,
                nonce: paramsNonce
              },
              privateKey,
              {
                jwtid: tokenId,
                algorithm: "RS512",
                expiresIn: jwtValidityDuration,
                audience: client.id,
                subject: user.id,
                issuer: realm
              }
            ),
            refresh_token: getRefreshToken(grant.secrets),
            expires_in: jwtValidityDuration,
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

    ctx.response.status = error.statusCode;
    ctx.response.body = body;
    ctx.app.emit("error", error, ctx);
  }
}

export default oAuth2Middleware;
