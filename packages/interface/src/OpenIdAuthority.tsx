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

export function OpenIdAuthority({
  authority,
  setAuthorization,
  redirect
}: StrategyComponentProps): ReactElement<StrategyComponentProps> {
  // Focus the openid field on mount
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

  // OpenId
  const [openid, setOpenId] = useState<string>("");

  // Proof
  const [proof, setProof] = useState<string>("");

  useEffect(() => {
    const proof = new URL(window.location.href).searchParams.get("proof");
    if (!proof) return;

    const payload = proof.split(".")[1];
    if (!payload) return;

    try {
      const { openid } = JSON.parse(atob(payload));
      if (openid) {
        setOpenId(openid);
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
    if (!openid) {
      setErrors(["Please enter an openid."]);
      return;
    }

    const operation = graphql.operate<
      {
        authenticateOpenId: null | {
          id: string;
          secret: null | string;
        };
      },
      {
        authorityId: string;
        openid: string;
        proof: null | string;
      }
    >({
      operation: {
        query: `
          mutation($authorityId: ID!, $openid: String!, $proof: String) {
            authenticateOpenId(
              authorityId: $authorityId,
              openid: $openid,
              proof: $proof
            ) {
              id
              secret
            }
          }
        `,
        variables: {
          authorityId: authority.id,
          openid,
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
      // make it more difficult for an attacker to query for valid openid
      // addresses, user IDs, or other information.
      if (result.graphQLErrors && result.graphQLErrors.length) {
        setErrors(result.graphQLErrors.map(e => e.message));
        return;
      }

      const authorization = result.data && result.data.authenticateOpenId;
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
        <span>OpenId</span>
        <input
          ref={focusElement}
          name="openid"
          type="openid"
          value={openid}
          onChange={e => setOpenId(e.target.value)}
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
        If you were sent a code to prove control of this openid address, enter
        it here.
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
