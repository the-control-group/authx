import v4 from "uuid/v4";
import jwt from "jsonwebtoken";
import { randomBytes } from "crypto";
import { Context } from "./Context";
import { Client, Grant, Token } from "./model";
import { NotFoundError } from "./errors";
import { validate } from "scopeutils";
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

export default async (ctx: ParameterizedContext<any, { [x]: Context }>) => {
  ctx.response.set("Cache-Control", "no-store");
  ctx.response.set("Pragma", "no-cache");

  const { tx, realm, jwtValidityDuration, privateKey } = ctx[x];

  try {
    // Make sure the body is an object.
    if (!ctx.body || typeof ctx.body !== "object") {
      ctx.response.body = { error: "invalid_request" };
      return;
    }

    const { grant_type: grantType } = ctx.body;
    if (!grantType) {
      ctx.response.body = { error: "invalid_request" };
      return;
    }

    // Authorization Code
    // ==================
    if (grantType === "authorization_code") {
      tx.query("BEGIN DEFERRABLE");
      try {
        const paramsClientId = ctx.body.client_id;
        const paramsClientSecret = ctx.body.client_secret;
        const paramsCode = ctx.body.code;
        const paramsScope = ctx.body.scope;
        if (!paramsClientId || !paramsClientSecret || !paramsCode) {
          throw new OAuthError("invalid_request");
        }

        const requestedScopes = paramsScope ? paramsScope.split(" ") : null;
        if (requestedScopes && !requestedScopes.every(validate)) {
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
        const [grantId, expiration, nonce] = Buffer.from(paramsCode, "base64")
          .toString("utf8")
          .split(":");

        if (!grantId || !expiration || !nonce) {
          throw new OAuthError("invalid_grant");
        }

        if (parseInt(expiration, 10) < Math.floor(Date.now() / 1000)) {
          throw new OAuthError("invalid_grant");
        }

        // Fetch the authorization code.
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

        // Create a new token.
        const tokenId = v4();
        const token = await Token.write(
          tx,
          {
            id: tokenId,
            enabled: true,
            userId: user.id,
            grantId: grant.id,
            secret: randomBytes(16).toString("hex"),
            scopes: requestedScopes
          },
          {
            recordId: v4(),
            createdByTokenId: tokenId,
            createdByCredentialId: null,
            createdAt: new Date()
          }
        );

        // Remove the authorization code.
        grant = await Grant.write(
          tx,
          {
            ...grant,
            codes: [...grant.codes].filter(c => c !== paramsCode)
          },
          {
            recordId: v4(),
            createdByTokenId: tokenId,
            createdAt: new Date()
          }
        );

        const body = {
          // eslint-disable-next-line
          token_type: "bearer",
          // eslint-disable-next-line
          access_token: jwt.sign(
            {
              type: "access_token",
              scopes: await token.access(tx)
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
          refresh_token: grant.secret,
          // eslint-disable-next-line
          expires_in: 3600,
          scope: (await token.access(tx)).join(" ")
        };

        await tx.query("COMMIT");

        ctx.response.body = body;
      } catch (error) {
        await tx.query("ROLLBACK");
        throw error;
      }
    }
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
