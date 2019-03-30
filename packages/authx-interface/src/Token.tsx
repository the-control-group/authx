import React, {
  useState,
  useRef,
  useEffect,
  useContext,
  FormEvent,
  ReactElement
} from "react";
import {
  GraphQL,
  GraphQLContext,
  useGraphQL,
  GraphQLFetchOptions
} from "graphql-react";

export function Token({
  fetchOptionsOverride,
  redirect,
  token,
  clearToken
}: {
  fetchOptionsOverride: (options: GraphQLFetchOptions) => void;
  redirect: null | (() => void);
  token: { id: string; secret: string };
  clearToken: () => void;
}): ReactElement<{ token: string }> {
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

  const { cacheValue } = useGraphQL<
    {
      viewer: null | {
        id: string;
        user: null | { id: string; contact: null | { displayName: string } };
      };
    },
    void
  >({
    fetchOptionsOverride,
    operation: {
      query: `
        query {
          viewer {
            id
            user {
              id
              contact {
                displayName
              }
            }
          }  
        }
      `
    }
  });

  const displayName =
    cacheValue &&
    cacheValue.data &&
    cacheValue.data.viewer &&
    cacheValue.data.viewer.user &&
    cacheValue.data.viewer.user.contact &&
    cacheValue.data.viewer.user.contact.displayName;

  // API and errors
  const graphql = useContext<GraphQL>(GraphQLContext);
  const [errors, setErrors] = useState<string[]>([]);
  async function onSubmit(e: FormEvent): Promise<void> {
    e.preventDefault();
    const operation = graphql.operate<
      {
        updateToken: null | {
          id: string;
          enabled: boolean;
        };
      },
      {
        id: string;
      }
    >({
      fetchOptionsOverride,
      operation: {
        query: `
          mutation($id: ID!) {
            updateToken(
              id: $id,
              enabled: false
            ) {
              id
              enabled
            }
          }
        `,
        variables: {
          id: token.id
        }
      }
    });

    try {
      const result = await operation.cacheValuePromise;
      if (result.fetchError) {
        setErrors([result.fetchError]);
        return;
      }

      if (result.graphQLErrors && result.graphQLErrors.length) {
        setErrors(result.graphQLErrors.map(e => e.message));
        return;
      }

      const token = result.data && result.data.updateToken;
      if (!token) {
        setErrors([
          "No token was returned. Contact your administrator to ensure you have sufficient access to read your own tokens."
        ]);
        return;
      }

      // We have successfully disabled the token!
      // Zero the error.
      setErrors([]);

      // Clear the token from our cookie store.
      clearToken();
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
      <p>You are logged in{displayName ? ` as ${displayName}` : ""}.</p>

      {errors.length
        ? errors.map((error, i) => (
            <p key={i} className="error">
              {error}
            </p>
          ))
        : null}

      <label>
        <input type="submit" value="Revoke Token" />
      </label>

      {errors.length ? (
        <div className="info">
          <p>
            If you are unable to revoke the current token, you can remove it
            from this browser. If you do this, make sure to revoke it from a
            different computer if you suspect it was comprimized.
          </p>
          <label>
            <input
              onClick={e => {
                e.preventDefault();
                clearToken();
              }}
              type="button"
              value="Reset Browser Data"
            />
          </label>
        </div>
      ) : null}

      {redirect ? (
        <label>
          <input
            type="button"
            value="Continue"
            onClick={e => {
              e.preventDefault();
              redirect();
            }}
          />
        </label>
      ) : null}
    </form>
  );
}
