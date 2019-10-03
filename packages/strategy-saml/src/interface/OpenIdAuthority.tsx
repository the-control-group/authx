import React, {
  useState,
  useRef,
  useEffect,
  useContext,
  ReactElement,
  FormEvent
} from "react";

import v4 from "uuid";
import { GraphQL, GraphQLContext } from "graphql-react";

interface Props {
  authority: SamlAuthorityFragmentData;
  setAuthorization: (authorization: { id: string; secret: string }) => void;
}

export function SamlAuthority({
  authority,
  setAuthorization
}: Props): ReactElement<Props> {
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

  const [operating, setOperating] = useState<boolean>(false);
  useEffect(() => {
    (async () => {
      const code = new URL(window.location.href).searchParams.get("code");
      const state = new URL(window.location.href).searchParams.get("state");
      if (
        !code ||
        !state ||
        window.localStorage.getItem(`authx.a.${authority.id}.s`) !== state
      ) {
        return;
      }

      setOperating(true);
      try {
        const operation = graphql.operate<
          {
            authenticateSaml: null | {
              id: string;
              secret: null | string;
            };
          },
          {
            authorityId: string;
            code: string;
          }
        >({
          operation: {
            query: `
            mutation($authorityId: ID!, $code: String!) {
              authenticateSaml(
                authorityId: $authorityId,
                code: $code,
              ) {
                id
                secret
              }
            }
          `,
            variables: {
              authorityId: authority.id,
              code
            }
          }
        });

        const result = await operation.cacheValuePromise;

        // Replace the current URL with the stored one.
        const r = window.localStorage.getItem(`authx.a.${authority.id}.r`);
        if (r) {
          window.history.replaceState({}, document.title, r);
        }

        // Clear stored values.
        window.localStorage.removeItem(`authx.a.${authority.id}.s`);
        window.localStorage.removeItem(`authx.a.${authority.id}.r`);

        if (result.fetchError) {
          setErrors([result.fetchError]);
          return;
        }

        if (result.graphQLErrors && result.graphQLErrors.length) {
          setErrors(result.graphQLErrors.map(e => e.message));
          return;
        }

        const authorization = result.data && result.data.authenticateSaml;
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
        setAuthorization({
          id: authorization.id,
          secret: authorization.secret
        });
      } catch (error) {
        setErrors([error.message]);
        return;
      } finally {
        setOperating(false);
      }
    })();
  }, []);

  // API and errors
  const graphql = useContext<GraphQL>(GraphQLContext);
  const [errors, setErrors] = useState<string[]>([]);
  async function onSubmit(e: FormEvent): Promise<void> {
    e.preventDefault();

    // Generate and store a state for use with the OAuth exchange.
    const state = v4();
    window.localStorage.setItem(`authx.a.${authority.id}.s`, state);

    // Store the current URL for later redirection.
    window.localStorage.setItem(
      `authx.a.${authority.id}.r`,
      window.location.href
    );

    // Strip all search params except authorityId from the redirect URL.
    const redirect = new URL(window.location.href);
    new URL(window.location.href).searchParams.forEach(
      (v, k) => k !== "authorityId" && redirect.searchParams.delete(k)
    );

    const url = new URL(authority.authUrl);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("client_id", authority.clientId);
    url.searchParams.set("redirect_uri", redirect.href);
    url.searchParams.set("scope", "openid profile email");
    url.searchParams.set("state", state);
    window.location.href = url.href;
  }

  return (
    <form
      onSubmit={onSubmit}
      className={errors.length ? "panel validate" : "panel"}
    >
      {!operating && errors.length
        ? errors.map((error, i) => (
            <p key={i} className="error">
              {error}
            </p>
          ))
        : null}

      <label>
        <input
          disabled={operating}
          ref={focusElement}
          type="submit"
          value={
            operating ? "Loading..." : `Authenticate with ${authority.name}`
          }
        />
      </label>
    </form>
  );
}

export interface SamlAuthorityFragmentData {
  __typename: "SamlAuthority";
  id: string;
  name?: null | string;
  authUrl: string;
  clientId: string;
}

export const SamlAuthorityFragment = `
  fragment SamlAuthorityFragment on SamlAuthority {
    __typename
    id
    name
    authUrl
    clientId
  }
`;
