import { Behavior, Rule } from "../Behavior";
import { verify, TokenExpiredError } from "jsonwebtoken";
import { validate } from "scopeutils";

export interface PassthroughRule extends Rule {
  readonly behavior: "passthrough";
}

export const passthrough: Behavior<PassthroughRule> = function passthrough(
  proxy,
  keys,
  rule,
  request,
  response
): void {
  // Extract the token from the authorization header.
  const token =
    request.headers.authorization &&
    request.headers.authorization.replace(/^BEARER\s+/i, "");

  function passthrough(scopes: string): void {
    response.setHeader("X-OAuth-Scopes", scopes);
    request.headers["X-OAuth-Scopes"] = scopes;
    proxy.httpProxy.web(request, response, {
      target: rule.target
    });
  }

  // No token exists.
  if (!token) {
    passthrough("");
    return;
  }

  // Try each public key.
  for (const key of keys) {
    try {
      // Verify the token against the key.
      const payload = verify(token, key, {
        algorithms: ["RS512"]
      }) as string | { scopes: string[] };

      // Ensure the token payload is correctly formatted.
      if (
        typeof payload !== "object" ||
        !Array.isArray(payload.scopes) ||
        !payload.scopes.every(
          scope => typeof scope === "string" && validate(scope)
        )
      ) {
        // This should never happen; if it does, it means that either:
        // - The AuthX server generated a malformed token.
        // - The private key has been compromised and was used to sign
        //   a malformed token.
        console.warn(
          "A cryptographically verified token contained a malformed payload."
        );
        passthrough("");
        return;
      }

      // Proxy the request.
      passthrough(payload.scopes.join(" "));
      return;
    } catch (error) {
      // The token is expired; there's no point in trying to verify
      // against additional public keys.
      if (error instanceof TokenExpiredError) {
        passthrough("");
        return;
      }

      // Keep trying public keys.
      continue;
    }
  }

  // The token couldn't be verfied against any of the public keys.
  passthrough("");
  return;
};
