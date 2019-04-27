import React, {
  useState,
  useRef,
  useEffect,
  useContext,
  ReactElement,
  FormEvent
} from "react";

import { GraphQL, GraphQLContext, useGraphQL } from "graphql-react";
import { StrategyComponentProps } from "./definitions";

export function EmailAuthority({
  authority,
  setAuthorization,
  redirect
}: StrategyComponentProps): ReactElement<StrategyComponentProps> {
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

  // Email
  const [email, setEmail] = useState<string>("");

  // Proof
  const [proof, setProof] = useState<string>("");

  useEffect(() => {
    const proof = new URL(window.location.href).searchParams.get("proof");
    if (!proof) return;

    const payload = proof.split(".")[1];
    if (!payload) return;

    try {
      const { email } = JSON.parse(atob(payload));
      if (email) {
        setEmail(email);
        setProof(proof);

        const url = new URL(window.location.href);
        url.searchParams.delete("proof");
        window.history.replaceState({}, document.title, url.href);
      }
    } catch (error) {}
  }, []);

  // API and errors
  const graphql = useContext<GraphQL>(GraphQLContext);
  const [errors, setErrors] = useState<string[]>([]);
  async function onSubmit(e: FormEvent): Promise<void> {
    e.preventDefault();
    if (!email) {
      setErrors(["Please enter an email."]);
      return;
    }

    const operation = graphql.operate<
      {
        authenticateEmail: null | {
          id: string;
          secret: null | string;
        };
      },
      {
        authorityId: string;
        email: string;
        proof: null | string;
      }
    >({
      operation: {
        query: `
          mutation($authorityId: ID!, $email: String!, $proof: String) {
            authenticateEmail(
              authorityId: $authorityId,
              email: $email,
              proof: $proof
            ) {
              id
              secret
            }
          }
        `,
        variables: {
          authorityId: authority.id,
          email,
          proof
        }
      }
    });

    try {
      const result = await operation.cacheValuePromise;
      if (result.fetchError) {
        setErrors([result.fetchError]);
        return;
      }

      // Usually, we would loop through these and display the correct errors by
      // the correct field. This would work in development, but in production,
      // AuthX only returns a single generic authentication failure message, to
      // make it more difficult for an attacker to query for valid email
      // addresses, user IDs, or other information.
      if (result.graphQLErrors && result.graphQLErrors.length) {
        setErrors(result.graphQLErrors.map(e => e.message));
        return;
      }

      const authorization = result.data && result.data.authenticateEmail;
      if (!authorization || !authorization.secret) {
        setErrors([
          "No authorization was returned. Contact your administrator to ensure you have sufficient access to read your own authorizations and authorization secrets."
        ]);
        return;
      }

      // We have successfully authenticated!
      // Zero the error.
      setErrors([]);

      // Set the authorization.
      setAuthorization({ id: authorization.id, secret: authorization.secret });

      // Redirect.
      if (redirect) {
        redirect();
      }
    } catch (error) {
      setErrors([error.message]);
      return;
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className={errors.length ? "panel validate" : "panel"}
    >
      <label>
        <span>Email</span>
        <input
          ref={focusElement}
          name="email"
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
        />
      </label>

      <label>
        <span>Proof</span>
        <input
          name="proof"
          type="text"
          value={proof}
          onChange={e => setProof(e.target.value)}
        />
      </label>
      <p>
        If you were sent a code to prove control of this email address, enter it
        here.
      </p>

      {errors.length
        ? errors.map((error, i) => (
            <p key={i} className="error">
              {error}
            </p>
          ))
        : null}

      <label>
        <input type="submit" value="Submit" />
      </label>
    </form>
  );
}
