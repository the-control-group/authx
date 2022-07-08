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

export function Default({
  fetchOptionsOverride,
  authorization,
  clearAuthorization
}: {
  fetchOptionsOverride: (options: GraphQLFetchOptions) => void;
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

  const { loading, cacheValue } = useGraphQL<
    {
      viewer: null | {
        id: string;
        user: null | { id: string; name: null | string };
      };
    },
    {}
  >({
    fetchOptionsOverride,
    loadOnMount: true,
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

  const displayName = cacheValue?.data?.viewer?.user?.name;

  // API and errors
  const graphql = useContext<GraphQL>(GraphQLContext);
  const [operating, setOperating] = useState<boolean>(false);
  const [errors, setErrors] = useState<string[]>([]);
  async function onSubmit(e: FormEvent): Promise<void> {
    e.preventDefault();

    setOperating(true);
    try {
      const operation = graphql.operate<
        {
          updateAuthorizations: null | ReadonlyArray<null | {
            id: string;
            enabled: boolean;
          }>;
        },
        {
          id: string;
        }
      >({
        fetchOptionsOverride,
        operation: {
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
            id: authorization.id
          }
        }
      });

      const result = await operation.cacheValuePromise;
      if (result.fetchError) {
        setErrors([result.fetchError]);
        return;
      }

      if (result.graphQLErrors?.length) {
        setErrors(result.graphQLErrors.map(e => e.message));
        return;
      }

      if (!result.data || !result.data.updateAuthorizations) {
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
    } catch (error:any) {
      setErrors([error.message]);
      return;
    } finally {
      setOperating(false);
    }
  }

  return (
    <div>
      <h1>AuthX</h1>
      <form
        onSubmit={onSubmit}
        className={errors.length ? "panel validate" : "panel"}
      >
        {loading ? (
          <p>Loading...</p>
        ) : (
          <>
            <p>You are logged in{displayName ? ` as ${displayName}` : ""}.</p>

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
                type="submit"
                value={operating ? "Loading..." : "Revoke Authorization"}
              />
            </label>

            {!operating && errors.length ? (
              <div className="info">
                <p>
                  If you are unable to revoke the current authorization, you can
                  remove it from this browser. If you do this, make sure to
                  revoke it from a different computer if you suspect it was
                  comprimized.
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
          </>
        )}
      </form>
    </div>
  );
}
