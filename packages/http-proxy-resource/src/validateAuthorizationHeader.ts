import jsonwebtoken from "jsonwebtoken";
const {
  verify,
  JsonWebTokenError,
  NotBeforeError,
  TokenExpiredError,
} = jsonwebtoken;
import { isValidScopeLiteral } from "@authx/scopes";
import { TokenDataCache } from "./TokenDataCache.js";

const BEARER = /^BEARER\s+/i;
const BASIC = /^BASIC\s+/i;

export class NotAuthorizedError extends Error {
  constructor(message: string, public readonly cause?: any) {
    super(message);
  }
}

export async function validateAuthorizationHeader(
  authxUrl: string,
  keys: ReadonlyArray<string>,
  authorizationHeader: string,
  tokenDataCache: TokenDataCache
): Promise<{
  authorizationId: string;
  authorizationSubject: string;
  authorizationScopes: string[];
}> {
  if (BASIC.test(authorizationHeader)) {
    try {
      const token = await tokenDataCache.getToken(authorizationHeader);

      return {
        authorizationId: token.id,
        authorizationSubject: token.user.id,
        authorizationScopes: token.access,
      };
    } catch (err) {
      throw new NotAuthorizedError(
        "The submitted basic token was rejected by AuthX",
        err
      );
    }
  }

  // BEARER
  if (BEARER.test(authorizationHeader)) {
    const token = authorizationHeader.replace(BEARER, "");

    // Try each public key.
    for (const key of keys) {
      try {
        // Verify the token against the key.
        const payload = verify(token, key, {
          algorithms: ["RS512"],
        }) as string | { sub: string; aid: string; scopes: string[] };

        // Ensure the token payload is correctly formatted.
        if (typeof payload !== "object") {
          throw new Error(
            "A cryptographically verified token contained a malformed payload."
          );
        }

        if (
          !Array.isArray(payload.scopes) ||
          !payload.scopes.every(
            (scope) => typeof scope === "string" && isValidScopeLiteral(scope)
          )
        ) {
          throw new Error(
            "A cryptographically verified token contained a malformed scope."
          );
        }

        if (typeof payload.aid !== "string") {
          throw new Error(
            "A cryptographically verified token contained a malformed aid."
          );
        }

        if (typeof payload.sub !== "string") {
          throw new Error(
            "A cryptographically verified token contained a malformed sub."
          );
        }

        return {
          authorizationId: payload.aid,
          authorizationSubject: payload.sub,
          authorizationScopes: payload.scopes,
        };
      } catch (error) {
        // Keep trying public keys.
        if (error instanceof JsonWebTokenError) {
          continue;
        }

        // The token is expired or not yet valid; there's no point in trying
        // to verify against additional public keys.
        if (
          error instanceof TokenExpiredError ||
          error instanceof NotBeforeError
        ) {
          break;
        }

        throw error;
      }
    }

    throw new NotAuthorizedError(
      "The submitted bearer token failed validation."
    );
  }

  throw new NotAuthorizedError(
    "The submitted authorization header was malformed."
  );
}
