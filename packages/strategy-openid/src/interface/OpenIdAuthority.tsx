import React, {
  useState,
  useRef,
  useEffect,
  ReactElement,
  FormEvent,
} from "react";

import { v4 } from "uuid";
import { useMutation } from "@tanstack/react-query";

const mutationFn = async ({
  authorityId,
  code,
}: {
  authorityId: string;
  code: string;
}): Promise<{
  errors?: { message: string }[];
  data?: {
    authenticateOpenId: null | {
      id: string;
      secret: null | string;
    };
  };
}> => {
  const result = await fetch("/graphql", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query: `
        mutation($authorityId: ID!, $code: String!) {
          authenticateOpenId(
            authorityId: $authorityId,
            code: $code,
          ) {
            id
            secret
          }
        }
      `,
      variables: {
        authorityId,
        code,
      },
    }),
  });

  return result.json();
};

interface Props {
  authority: OpenIdAuthorityFragmentData;
  setAuthorization: (authorization: { id: string; secret: string }) => void;
}

export function OpenIdAuthority({
  authority,
  setAuthorization,
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

  const mutation = useMutation({
    mutationFn,
    onError(error) {
      setErrors([error.message]);
    },
    onSuccess(result) {
      if (result.errors?.length) {
        // Usually, we would loop through these and display the correct errors
        // by the correct field. This would work in development, but in
        // production, AuthX only returns a single generic authentication
        // failure message, to make it more difficult for an attacker to query
        // for valid email addresses, user IDs, or other information.
        setErrors(result.errors.map((e) => e.message));
        return;
      }

      // Replace the current URL with the stored one.
      const r = window.localStorage.getItem(`authx.a.${authority.id}.r`);
      if (r) {
        window.history.replaceState({}, document.title, r);
      }

      // Clear stored values.
      window.localStorage.removeItem(`authx.a.${authority.id}.s`);
      window.localStorage.removeItem(`authx.a.${authority.id}.r`);

      const authorization = result.data?.authenticateOpenId;
      if (!authorization || !authorization.secret) {
        setErrors([
          "No authorization was returned. Contact your administrator to ensure you have sufficient access to read your own authorizations and authorization secrets.",
        ]);
        return;
      }

      // We have successfully authenticated!
      // Zero the error.
      setErrors([]);

      // Set the authorization.
      setAuthorization({ id: authorization.id, secret: authorization.secret });
    },
  });

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
    })();
  }, []);

  // API and errors
  const [errors, setErrors] = useState<string[]>([]);
  async function onSubmit(e: FormEvent): Promise<void> {
    e.preventDefault();

    // Generate and store a state for use with the OAuth exchange.
    const state = v4();
    window.localStorage.setItem(`authx.a.${authority.id}.s`, state);

    // Store the current URL for later redirection.
    window.localStorage.setItem(
      `authx.a.${authority.id}.r`,
      window.location.href,
    );

    // Strip all search params except authorityId from the redirect URL.
    const redirect = new URL(window.location.href);
    new URL(window.location.href).searchParams.forEach(
      (v, k) => k !== "authorityId" && redirect.searchParams.delete(k),
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
      {!mutation.isPending && errors.length
        ? errors.map((error, i) => (
            <p key={i} className="error">
              {error}
            </p>
          ))
        : null}

      <label>
        <input
          disabled={mutation.isPending}
          ref={focusElement}
          type="submit"
          value={
            mutation.isPending
              ? "Loading..."
              : `Authenticate with ${authority.name}`
          }
        />
      </label>
    </form>
  );
}

export interface OpenIdAuthorityFragmentData {
  __typename: "OpenIdAuthority";
  id: string;
  name?: null | string;
  authUrl: string;
  clientId: string;
}

export const OpenIdAuthorityFragment = `
  fragment OpenIdAuthorityFragment on OpenIdAuthority {
    __typename
    id
    name
    authUrl
    clientId
  }
`;
