import { Behavior, Rule } from "../Behavior";
import { verify, TokenExpiredError } from "jsonwebtoken";
import { validate, isSuperset } from "scopeutils";
import { URL } from "url";

export interface AuthorizeRule extends Rule {
  readonly behavior: "authorize";
  readonly requiredScopes: string[];
}

export const authorize: Behavior<AuthorizeRule> = function authorize(
  proxy,
  keys,
  rule: AuthorizeRule,
  request,
  response
): void {
  // Extract the token from the authorization header.
  const token =
    request.headers.authorization &&
    request.headers.authorization.replace(/^BEARER\s+/i, "");

  function authorize(scopes: string): void {
    const client = proxy.config.client;
    if (!client) {
      response.statusCode = 500;
    } else {
      const location = new URL(client.oauthProviderUrl);
      location.searchParams.set("grant_type", "code");
      location.searchParams.set("client_id", client.id);
      location.searchParams.set("redirect_uri", client.url);

      response.statusCode = 302;
      response.setHeader("Location", location.href);
      response.setHeader("X-OAuth-Scopes", scopes);
      response.setHeader(
        "X-OAuth-Required-Scopes",
        rule.requiredScopes.join(" ")
      );
      response.setHeader(
        "Set-Cookie",
        `authx_proxy_destination=${encodeURIComponent(
          request.url ||
            (proxy.config.client &&
              proxy.config.client.defaultDestinationUrl) ||
            "/"
        )}`
      );
    }

    // TODO: this shouldn't need to be cast through any
    // https://github.com/DefinitelyTyped/DefinitelyTyped/pull/34898
    if ((request as any).complete) {
      response.end();
    } else {
      request.once("end", () => response.end());
      request.resume();
    }
  }

  function passthrough(scopes: string): void {
    response.setHeader(
      "X-OAuth-Required-Scopes",
      rule.requiredScopes.join(" ")
    );
    response.setHeader("X-OAuth-Scopes", scopes);
    request.headers["X-OAuth-Scopes"] = scopes;
    proxy.httpProxy.web(request, response, {
      target: rule.target
    });
  }

  // No token exists in the request.
  if (!token) {
    authorize("", 401);
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
        authorize("", 401);
        return;
      }

      // Ensure that the token includes all the required scopes.
      if (
        !rule.requiredScopes.every(scope => isSuperset(scope, payload.scopes))
      ) {
        authorize(payload.scopes.join(" "), 403);
        return;
      }

      // Proxy the request.
      passthrough(payload.scopes.join(" "));
      return;
    } catch (error) {
      // The token is expired; there's no point in trying to verify
      // against additional public keys.
      if (error instanceof TokenExpiredError) {
        authorize("", 401);
        return;
      }

      // Keep trying public keys.
      continue;
    }
  }

  // The token couldn't be verfied against any of the public keys.
  authorize("", 401);
  return;
};
