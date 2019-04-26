import v4 from "uuid/v4";
import jwt from "jsonwebtoken";
import { randomBytes } from "crypto";
import { Context } from "./Context";
import { Client, Grant, Authorization } from "./model";
import { NotFoundError } from "./errors";
import { validate, isEqual } from "scopeutils";
import { ParameterizedContext } from "koa";
import x from "./x";

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
function getRefreshAuthorization(secrets: Iterable<string>): null | string {
  let refreshAuthorization = null;
  let max = 0;
  for (const secret of secrets) {
    const issuedString = Buffer.from(secret, "base64")
      .toString("utf8")
      .split(":")[1];

    const issuedNumber = parseInt(issuedString);
    if (issuedString && issuedNumber && issuedNumber > max) {
      refreshAuthorization = secret;
      max = issuedNumber;
    }
  }

  return refreshAuthorization;
}

export default async (ctx: ParameterizedContext<any, { [x]: Context }>) => {
  ctx.response.set("Cache-Control", "no-store");
  ctx.response.set("Pragma", "no-cache");

  const {
    tx,
    realm,
    jwtValidityDuration,
    codeValidityDuration,
    privateKey
  } = ctx[x];

  try {
    // Make sure the body is an object.
    if (!ctx.body || typeof ctx.body !== "object") {
      throw new OAuthError("invalid_request");
    }

    const grantType: undefined | string = ctx.body.grant_type;

    // Authorization Code
    // ==================
    if (grantType === "authorization_code") {
      tx.query("BEGIN DEFERRABLE");
      try {
        const now = Math.floor(Date.now() / 1000);
        const paramsClientId: undefined | string = ctx.body.client_id;
        const paramsClientSecret: undefined | string = ctx.body.client_secret;
        const paramsCode: undefined | string = ctx.body.code;
        const paramsScope: undefined | string = ctx.body.scope;
        if (!paramsClientId || !paramsClientSecret || !paramsCode) {
          throw new OAuthError("invalid_request");
        }

        const requestedScopes = paramsScope ? paramsScope.split(" ") : [];
        if (paramsScope && !requestedScopes.every(validate)) {
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
        const [grantId, issuedAt, nonce] = Buffer.from(paramsCode, "base64")
          .toString("utf8")
          .split(":");

        if (!grantId || !issuedAt || !nonce) {
          throw new OAuthError("invalid_grant");
        }

        if (parseInt(issuedAt, 10) + codeValidityDuration < now) {
          throw new OAuthError("invalid_grant");
        }

        // Fetch the grant.
        let grant;
        try {
          grant = await Grant.read(tx, grantId);
        } catch (error) {
          if (!(error instanceof NotFoundError)) throw error;
          throw new OAuthError("invalid_grant");
        }

        if (!grant.enabled) {
          throw new OAuthError("invalid_grant");
        }

        if (!grant.codes.has(paramsCode)) {
          throw new OAuthError("invalid_grant");
        }

        // Fetch the user.
        const user = await grant.user(tx);
        if (!user.enabled) {
          throw new OAuthError("invalid_grant");
        }

        // Look for an existing active authorization for this grant with the same scopes
        const authorizations = (await grant.authorizations(tx)).filter(
          t => t.enabled && isEqual(requestedScopes, t.scopes)
        );

        const authorization = authorizations.length
          ? // Use an existing authorization.
            authorizations[0]
          : // Create a new authorization.
            await (() => {
              const authorizationId = v4();
              return Authorization.write(
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
            })();

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
          // eslint-disable-next-line
          authorization_type: "bearer",
          // eslint-disable-next-line
          access_authorization: jwt.sign(
            {
              type: "access_authorization",
              scopes: await authorization.access(tx)
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
          // eslint-disable-next-line
          refresh_authorization: getRefreshAuthorization(grant.secrets),
          // eslint-disable-next-line
          expires_in: 3600,
          scope: (await authorization.access(tx)).join(" ")
        };

        await tx.query("COMMIT");
        ctx.response.body = body;
      } catch (error) {
        await tx.query("ROLLBACK");
        throw error;
      }
    }

    // Refresh Authorization
    // =============
    if (grantType === "refresh_authorization") {
      tx.query("BEGIN DEFERRABLE");
      try {
        const paramsClientId: undefined | string = ctx.body.client_id;
        const paramsClientSecret: undefined | string = ctx.body.client_secret;
        const paramsRefreshAuthorization: undefined | string =
          ctx.body.refresh_authorization;
        const paramsScope: undefined | string = ctx.body.scope;
        if (
          !paramsClientId ||
          !paramsClientSecret ||
          !paramsRefreshAuthorization
        ) {
          throw new OAuthError("invalid_request");
        }

        const requestedScopes = paramsScope ? paramsScope.split(" ") : [];
        if (paramsScope && !requestedScopes.every(validate)) {
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
        const [grantId, secret] = Buffer.from(
          paramsRefreshAuthorization,
          "base64"
        )
          .toString("utf8")
          .split(":");

        if (!grantId || !secret) {
          throw new OAuthError("invalid_grant");
        }

        // Fetch the grant.
        let grant;
        try {
          grant = await Grant.read(tx, grantId);
        } catch (error) {
          if (!(error instanceof NotFoundError)) throw error;
          throw new OAuthError("invalid_grant");
        }

        if (!grant.enabled) {
          throw new OAuthError("invalid_grant");
        }

        if (!grant.secrets.has(paramsRefreshAuthorization)) {
          throw new OAuthError("invalid_grant");
        }

        // Fetch the user.
        const user = await grant.user(tx);
        if (!user.enabled) {
          throw new OAuthError("invalid_grant");
        }

        // Look for an existing active authorization for this grant with the same scopes
        const authorizations = (await grant.authorizations(tx)).filter(
          t => t.enabled && isEqual(requestedScopes, t.scopes)
        );

        const authorization = authorizations.length
          ? // Use an existing authorization.
            authorizations[0]
          : // Create a new authorization.
            await (() => {
              const authorizationId = v4();
              return Authorization.write(
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
            })();

        const body = {
          // eslint-disable-next-line
          authorization_type: "bearer",
          // eslint-disable-next-line
          access_authorization: jwt.sign(
            {
              type: "access_authorization",
              scopes: await authorization.access(tx)
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
          // eslint-disable-next-line
          refresh_authorization: getRefreshAuthorization(grant.secrets),
          // eslint-disable-next-line
          expires_in: 3600,
          scope: (await authorization.access(tx)).join(" ")
        };

        await tx.query("COMMIT");

        ctx.response.body = body;
      } catch (error) {
        await tx.query("ROLLBACK");
        throw error;
      }
    }

    // Unsupported Grant Type
    throw new OAuthError("unsupported_grant_type");
  } catch (error) {
    if (!(error instanceof OAuthError)) throw error;
    const body: {
      error: string;
      error_message?: string;
      error_uri?: string;
    } = { error: error.code };

    if (error.message !== error.code) {
      // eslint-disable-next-line
      body.error_message = error.message;
    }

    if (error.uri) {
      // eslint-disable-next-line
      body.error_uri = error.uri;
    }

    ctx.response.body = body;
  }
};
