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

export function Authorization({
  fetchOptionsOverride,
  redirect,
  authorization,
  clearAuthorization
}: {
  fetchOptionsOverride: (options: GraphQLFetchOptions) => void;
  redirect: null | (() => void);
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

  const { cacheValue } = useGraphQL<
    {
      viewer: null | {
        id: string;
        user: null | { id: string; name: null | string };
      };
    },
    {}
  >({
    fetchOptionsOverride,
    operation: {
      variables: {},
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
      `
    }
  });

  const displayName =
    cacheValue &&
    cacheValue.data &&
    cacheValue.data.viewer &&
    cacheValue.data.viewer.user &&
    cacheValue.data.viewer.user.name;

  // API and errors
  const graphql = useContext<GraphQL>(GraphQLContext);
  const [errors, setErrors] = useState<string[]>([]);
  async function onSubmit(e: FormEvent): Promise<void> {
    e.preventDefault();
    const operation = graphql.operate<
      {
        updateAuthorization: null | {
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
            updateAuthorization(
              id: $id,
              enabled: false
            ) {
              id
              enabled
            }
          }
        `,
        variables: {
          id: authorization.id
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

      const authorization = result.data && result.data.updateAuthorization;
      if (!authorization) {
        setErrors([
          "No authorization was returned. Contact your administrator to ensure you have sufficient access to read your own authorizations."
        ]);
        return;
      }

      // We have successfully disabled the authorization!
      // Zero the error.
      setErrors([]);

      // Clear the authorization from our cookie store.
      clearAuthorization();
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
        <input type="submit" value="Revoke Authorization" />
      </label>

      {errors.length ? (
        <div className="info">
          <p>
            If you are unable to revoke the current authorization, you can
            remove it from this browser. If you do this, make sure to revoke it
            from a different computer if you suspect it was comprimized.
          </p>
          <label>
            <input
              onClick={e => {
                e.preventDefault();
                clearAuthorization();
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
