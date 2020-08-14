import { ClientBase } from "pg";
import { verify, TokenExpiredError } from "jsonwebtoken";
import { Authorization } from "../model";
import { NotFoundError, AuthenticationError } from "../errors";

const __DEV__ = process.env.NODE_ENV !== "production";

export async function fromBasic(
  tx: ClientBase,
  basic: string
): Promise<Authorization> {
  const [id, secret] = Buffer.from(basic, "base64").toString().split(":", 2);
  let authorization;

  try {
    authorization = await Authorization.read(tx, id);
  } catch (error) {
    if (!(error instanceof NotFoundError)) throw error;
    throw new AuthenticationError(
      __DEV__
        ? "Unable to find the authorization specified in the HTTP authorization header."
        : undefined
    );
  }

  if (!authorization.enabled)
    throw new AuthenticationError(
      __DEV__
        ? "The authorization specified in HTTP authorization header is disabled."
        : undefined
    );

  if (authorization.secret !== secret)
    throw new AuthenticationError(
      __DEV__
        ? "The secret specified in HTTP authorization header was incorrect."
        : undefined
    );

  const grant = await authorization.user(tx);
  if (grant && !grant.enabled)
    throw new AuthenticationError(
      __DEV__
        ? "The grant of the authorization specified in HTTP authorization header is disabled."
        : undefined
    );

  if (!(await authorization.user(tx)).enabled)
    throw new AuthenticationError(
      __DEV__
        ? "The user of the authorization specified in HTTP authorization header is disabled."
        : undefined
    );

  return authorization;
}

export async function fromBearer(
  tx: ClientBase,
  keys: string[],
  bearer: string
): Promise<Authorization> {
  let payload;
  let authorization;

  for (const key of keys) {
    try {
      payload = verify(bearer, key, {
        algorithms: ["RS512"]
      }) as {
        aid: string;
        sub: string;
      };
    } catch (error) {
      // The token is expired; there's no point in trying to verify
      // against additional public keys.
      if (error instanceof TokenExpiredError) {
        break;
      }

      // Keep trying public keys.
      continue;
    }
  }

  if (
    !payload ||
    typeof payload.aid !== "string" ||
    typeof payload.sub !== "string"
  )
    throw new AuthenticationError(
      __DEV__
        ? "The token specified in the HTTP authorization header was invalid."
        : undefined
    );

  try {
    authorization = await Authorization.read(tx, payload.aid);
  } catch (error) {
    if (!(error instanceof NotFoundError)) throw error;
    throw new AuthenticationError(
      __DEV__
        ? "Unable to find the authorization specified in the HTTP authorization header."
        : undefined
    );
  }

  if (!authorization.enabled)
    throw new AuthenticationError(
      __DEV__
        ? "The authorization specified in HTTP authorization header is disabled."
        : undefined
    );

  const grant = await authorization.user(tx);
  if (grant && !grant.enabled)
    throw new AuthenticationError(
      __DEV__
        ? "The grant of the authorization specified in HTTP authorization header is disabled."
        : undefined
    );

  if (authorization.userId !== payload.sub)
    throw new AuthenticationError(
      __DEV__
        ? "INVARIANT: The authorization belongs to a different user than the token."
        : undefined
    );

  if (!(await authorization.user(tx)).enabled)
    throw new AuthenticationError(
      __DEV__
        ? "The user of the authorization specified in HTTP authorization header is disabled."
        : undefined
    );

  return authorization;
}
