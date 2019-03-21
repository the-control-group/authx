import React, {
  useState,
  useRef,
  useEffect,
  useContext,
  ReactElement,
  FormEvent
} from "react";
import { GraphQL, GraphQLContext } from "graphql-react";
import { StrategyComponentProps } from "./definitions";

export function PasswordAuthority({
  authority,
  authorities
}: StrategyComponentProps): ReactElement {
  // Focus the email field on mount
  const focusElement = useRef<HTMLInputElement>(null);
  const [mounted, setMounted] = useState<boolean>(false);
  if (!mounted) setMounted(true);
  const [focused, setFocused] = useState<boolean>(false);
  useEffect(() => {
    const { current } = focusElement;
    if (!focused && current) {
      current.focus();
      setFocused(true);
    }
  });

  // Identity
  const [identityAuthorityId, setIdentityAuthorityId] = useState<string>("");
  const [identityAuthorityUserId, setIdentityAuthorityUserId] = useState<
    string
  >("");
  const identityAuthority =
    (identityAuthorityId &&
      authorities.find(a => a.id === identityAuthorityId)) ||
    null;

  // Default to using an email address
  if (!identityAuthorityId) {
    const firstEmailAuthority = authorities.find(a => a.strategy === "email");
    if (firstEmailAuthority) {
      setIdentityAuthorityId(firstEmailAuthority.id);
    }
  }

  // Password
  const [password, setPassword] = useState<string>("");

  // API and errors
  const graphql = useContext<GraphQL>(GraphQLContext);
  const [error, setError] = useState<string>("");
  async function onSubmit(e: FormEvent): Promise<void> {
    e.preventDefault();
    if (!identityAuthorityId || !identityAuthorityUserId || !password) {
      setError("Please fill out both an identity and password.");
      return;
    }

    const operation = graphql.operate<
      {
        authenticatePassword: {
          id: string;
          secret: null | string;
        };
      },
      {
        identityAuthorityId: string;
        identityAuthorityUserId: string;
        passwordAuthorityId: string;
        password: string;
      }
    >({
      operation: {
        query: `
                mutation($identityAuthorityId: ID!, $identityAuthorityUserId: String!, $passwordAuthorityId: ID!, $password: String!) {
                  authenticatePassword(
                    identityAuthorityId: $identityAuthorityId,
                    identityAuthorityUserId: $identityAuthorityUserId,
                    passwordAuthorityId: $passwordAuthorityId,
                    password: $password,
                  ) {
                    id
                    secret
                  }
                }
              `,
        variables: {
          identityAuthorityId,
          identityAuthorityUserId,
          passwordAuthorityId: authority.id,
          password
        }
      }
    });

    try {
      const result = await operation.cacheValuePromise;
      if (result.fetchError) {
        setError(result.fetchError);
        return;
      }

      // Usually, we would loop through these and display the correct errors
      // by the correct field. This would work in development, but in
      // production, AuthX only returns a single generic authentication
      // failure message, to make it more difficult for an attacker to query
      // for valid email addresses, user IDs, or other information.
      if (result.graphQLErrors && result.graphQLErrors.length) {
        setError(result.graphQLErrors[0].message);
        return;
      }

      const token = result.data && result.data.authenticatePassword;
      if (!token || !token.secret) {
        setError(
          "No token was returned. Contact your administrator to ensure you have sufficient access to read your own tokens and token secrets."
        );
        return;
      }

      // We have successfully authenticated!
      // Zero the error.
      setError("");

      // Set the cookie.
      document.cookie = `session=${btoa(
        `${token.id}:${token.secret}`
      )}; path=/; max-age=604800`;

      // Redirect.
      // TODO: actually redirect, depending on props
      // window.location.reload();
    } catch (error) {
      setError(error.message);
      return;
    }
  }

  return (
    <form onSubmit={onSubmit} className={error ? "validate" : ""}>
      <label>
        <span>Identity</span>
        <div style={{ display: "flex" }}>
          <select
            value={identityAuthorityId}
            onChange={e => setIdentityAuthorityId(e.target.value)}
            style={{ marginRight: "14px" }}
          >
            <option value={authority.id}>User ID</option>
            {authorities
              .filter(a => a.strategy === "email")
              .map(a => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
          </select>
          <input
            ref={focusElement}
            type={(identityAuthority && identityAuthority.strategy) || "text"}
            value={identityAuthorityUserId}
            onChange={e => setIdentityAuthorityUserId(e.target.value)}
            style={{ flex: "1" }}
            required
          />
        </div>
      </label>
      <label>
        <span>Password</span>
        <input
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
        />
      </label>

      {error ? <p className="error">{error}</p> : null}

      <label>
        <input type="submit" value="Submit" />
      </label>
    </form>
  );
}
