import { useMutation, useQuery } from "@tanstack/react-query";
import React, {
  useState,
  useRef,
  useEffect,
  FormEvent,
  ReactElement,
} from "react";

const makeQuery = async (
  authorizationId: string,
  authorizationSecret: string,
): Promise<{
  errors?: { message: string }[];
  data?: {
    viewer?: null | {
      id: string;
      user?: null | {
        id: string;
        name: string;
      };
    };
  };
}> => {
  const result = await fetch("/graphql", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${btoa(`${authorizationId}:${authorizationSecret}`)}`,
    },
    body: JSON.stringify({
      query: `
        query {
          viewer {
            id
            user {
              id
              name
            }
          }
        }
    `,
    }),
  });

  return await result.json();
};

const mutationFn = async ({
  authorizationId,
  authorizationSecret,
}: {
  authorizationId: string;
  authorizationSecret: string;
}): Promise<{
  errors?: { message: string }[];
  data?: {
    updateAuthorizations: null | ReadonlyArray<null | {
      id: string;
      enabled: boolean;
    }>;
  };
}> => {
  const result = await fetch("/graphql", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${btoa(`${authorizationId}:${authorizationSecret}`)}`,
    },
    body: JSON.stringify({
      query: `
        mutation($id: ID!) {
          updateAuthorizations(
            authorizations: [{
              id: $id,
              enabled: false
            }]
          ) {
            id
            enabled
          }
        }
          `,
      variables: {
        id: authorizationId,
      },
    }),
  });

  return result.json();
};

export function Default({
  authorization,
  clearAuthorization,
}: {
  authorization: { id: string; secret: string };
  clearAuthorization: () => void;
}): ReactElement<{ authorization: string }> {
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

  // Get the current user.
  const { data, isLoading } = useQuery({
    queryKey: ["viewer", authorization.id],
    queryFn: () => makeQuery(authorization.id, authorization.secret),
  });

  const displayName = data?.data?.viewer?.user?.name;

  // API and errors
  const mutation = useMutation({
    mutationFn,
    onError(error) {
      setErrors([error.message]);
    },
    onSuccess(result) {
      if (result.errors?.length) {
        setErrors(result.errors.map((e) => e.message));
        return;
      }

      if (!result.data || !result.data.updateAuthorizations) {
        setErrors([
          "No authorization was returned. Contact your administrator to ensure you have sufficient access to read your own authorizations.",
        ]);
        return;
      }

      // We have successfully disabled the authorization!
      // Zero the error.
      setErrors([]);

      // Clear the authorization from our cookie store.
      clearAuthorization();
    },
  });

  const [errors, setErrors] = useState<string[]>([]);
  async function onSubmit(e: FormEvent): Promise<void> {
    e.preventDefault();

    mutation.mutate({
      authorizationId: authorization.id,
      authorizationSecret: authorization.secret,
    });
  }

  return (
    <div>
      <h1>AuthX</h1>
      <form
        onSubmit={onSubmit}
        className={errors.length ? "panel validate" : "panel"}
      >
        {isLoading ? (
          <p>Loading...</p>
        ) : (
          <>
            <p>You are logged in{displayName ? ` as ${displayName}` : ""}.</p>

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
                value={
                  mutation.isPending ? "Loading..." : "Revoke Authorization"
                }
              />
            </label>

            {!mutation.isPending && errors.length ? (
              <div className="info">
                <p>
                  If you are unable to revoke the current authorization, you can
                  remove it from this browser. If you do this, make sure to
                  revoke it from a different device if you suspect it was
                  comprimized.
                </p>
                <label>
                  <input
                    onClick={(e) => {
                      e.preventDefault();
                      clearAuthorization();
                    }}
                    type="button"
                    value="Reset Browser Data"
                  />
                </label>
              </div>
            ) : null}
          </>
        )}
      </form>
    </div>
  );
}
