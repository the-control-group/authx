import React, {
  FormEvent,
  ReactElement,
  useEffect,
  useRef,
  useState,
} from "react";

interface Props {
  authority: SamlAuthorityFragmentData;
  setAuthorization: (authorization: { id: string; secret: string }) => void;
}

export function SamlAuthority({
  authority,
  setAuthorization,
}: Props): ReactElement<Props> {
  // Focus the Saml field on mount
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

  useEffect(() => {
    (async () => {
      const cookieMap: { [key: string]: string } = {};
      for (const kv of window.document.cookie
        .split("; ")
        .map((it) => it.split("="))) {
        cookieMap[kv[0]] = kv[1];
      }

      if (
        cookieMap.samlFinishedAuthorizationId &&
        cookieMap.samlFinishedAuthorizationSecret
      ) {
        setAuthorization({
          id: cookieMap["strategy.saml.authorization_id"],
          secret: cookieMap["strategy.saml.authorization_secret"],
        });
        window.document.cookie = "strategy.saml.authorization_id=";
        window.document.cookie = "strategy.saml.authorization_secret=";
        window.document.cookie = "strategy.saml.destination=";
      }

      const params = new URLSearchParams(window.location.search);
      const errorsParam = params.getAll("errors");

      if (errorsParam) {
        setErrors(errorsParam);
      }
    })();
  }, []);

  // API and errors
  const [errors, setErrors] = useState<string[]>([]);
  async function onSubmit(e: FormEvent): Promise<void> {
    e.preventDefault();

    // Save the current URL for internal redirection.
    window.document.cookie = `strategy.saml.destination=${encodeURIComponent(
      window.location.href
    )}`;

    window.location.href = authority.authUrlWithParams;
  }

  return (
    <form
      onSubmit={onSubmit}
      className={errors.length ? "panel validate" : "panel"}
    >
      {errors.length
        ? errors.map((error, i) => (
            <p key={i} className="error">
              {error}
            </p>
          ))
        : null}

      <label>
        <input
          ref={focusElement}
          type="submit"
          value={`Authenticate with ${authority.name}`}
        />
      </label>
    </form>
  );
}

export interface SamlAuthorityFragmentData {
  __typename: "SamlAuthority";
  id: string;
  name?: null | string;
  authUrlWithParams: string;
}

export const SamlAuthorityFragment = `
  fragment SamlAuthorityFragment on SamlAuthority {
    __typename
    id
    name
    authUrlWithParams
  }
`;
