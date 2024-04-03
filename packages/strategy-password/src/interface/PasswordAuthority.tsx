import React, {
  useState,
  useRef,
  useEffect,
  ReactElement,
  FormEvent,
} from "react";

import { useMutation } from "@tanstack/react-query";

const mutationFn = async ({
  identityAuthorityId,
  identityAuthorityUserId,
  passwordAuthorityId,
  password,
}: {
  identityAuthorityId: string;
  identityAuthorityUserId: string;
  passwordAuthorityId: string;
  password: string;
}): Promise<{
  errors?: { message: string }[];
  data?: {
    authenticatePassword: {
      id: string;
      secret: string;
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
        passwordAuthorityId,
        password,
      },
    }),
  });

  return result.json();
};

interface Props {
  authority: PasswordAuthorityFragmentData;
  authorities: { __typename: string; id: string; name?: null | string }[];
  setAuthorization: (authorization: { id: string; secret: string }) => void;
}

export function PasswordAuthority({
  authority,
  authorities,
  setAuthorization,
}: Props): ReactElement<Props> {
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
  const identityAuthorityState = useState<string>("");
  const setIdentityAuthorityId = identityAuthorityState[1];
  const identityAuthorityId =
    authorities.length === 1 ? authorities[0].id : identityAuthorityState[0];

  const [identityAuthorityUserId, setIdentityAuthorityUserId] =
    useState<string>("");
  const identityAuthority =
    (identityAuthorityId &&
      authorities.find((a) => a.id === identityAuthorityId)) ||
    null;

  // Default to using an email address
  if (!identityAuthorityId) {
    const firstEmailAuthority = authorities.find(
      (a) => a.__typename === "EmailAuthority",
    );
    if (firstEmailAuthority) {
      setIdentityAuthorityId(firstEmailAuthority.id);
    } else if (authorities.length) {
      setIdentityAuthorityId(authorities[0].id);
    }
  }

  // Password
  const [password, setPassword] = useState<string>("");

  // API and errors
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

      const authorization = result.data?.authenticatePassword;
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

  const [errors, setErrors] = useState<string[]>([]);
  async function onSubmit(e: FormEvent): Promise<void> {
    e.preventDefault();
    if (!identityAuthorityId || !identityAuthorityUserId || !password) {
      setErrors(["Please select an identity and enter a password."]);
      return;
    }

    mutation.mutate({
      identityAuthorityId,
      identityAuthorityUserId,
      passwordAuthorityId: authority.id,
      password,
    });
  }

  return (
    <form
      onSubmit={onSubmit}
      className={errors.length ? "panel validate" : "panel"}
    >
      <div className="label">
        <label className="span" htmlFor="password-authority-identity">
          Identity
        </label>
        <div style={{ display: "flex" }}>
          {authorities.length > 1 ? (
            <select
              disabled={mutation.isPending}
              value={identityAuthorityId}
              onChange={(e) => setIdentityAuthorityId(e.target.value)}
              style={{ marginRight: "14px" }}
            >
              <option value={authority.id}>User ID</option>
              {authorities
                .filter((a) => a.__typename === "EmailAuthority")
                .map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
            </select>
          ) : null}
          <input
            id="password-authority-identity"
            disabled={mutation.isPending}
            ref={focusElement}
            name={
              (identityAuthority &&
                (identityAuthority.__typename === "PasswordAuthority"
                  ? "id"
                  : identityAuthority.__typename)) ||
              "id"
            }
            type={
              (identityAuthority &&
                (identityAuthority.__typename === "EmailAuthority"
                  ? "email"
                  : identityAuthority.__typename === "PhoneAuthority"
                    ? "tel"
                    : null)) ||
              "text"
            }
            value={identityAuthorityUserId}
            onChange={(e) => setIdentityAuthorityUserId(e.target.value)}
            style={{ flex: "1" }}
            required
          />
        </div>
      </div>
      <label>
        <span>Password</span>
        <input
          disabled={mutation.isPending}
          name="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </label>

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
          type="submit"
          value={mutation.isPending ? "Loading..." : "Submit"}
        />
      </label>
    </form>
  );
}

export interface PasswordAuthorityFragmentData {
  __typename: "PasswordAuthority";
  id: string;
  name?: null | string;
}

export const PasswordAuthorityFragment = `
  fragment PasswordAuthorityFragment on PasswordAuthority {
    __typename
    id
    name
  }
`;
