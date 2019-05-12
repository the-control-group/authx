import React, { Fragment, ReactElement } from "react";
import { useGraphQL, GraphQLFetchOptionsOverride } from "graphql-react";

export function Default({
  clearAuthorization,
  fetchOptionsOverride
}: {
  clearAuthorization: () => void;
  fetchOptionsOverride: GraphQLFetchOptionsOverride;
}): ReactElement<any> {
  // Get the current user from the API.
  const { loading, cacheValue } = useGraphQL<
    {
      viewer: null | {
        user: null | {
          id: string;
          name: null | string;
        };
      };
    },
    undefined
  >({
    fetchOptionsOverride,
    loadOnMount: true,
    operation: {
      query: `
        query {
          viewer {
            user {
              id
              name
            }
          }
        }
      `
    }
  });

  const user =
    cacheValue &&
    cacheValue.data &&
    cacheValue.data.viewer &&
    cacheValue.data.viewer.user;

  // Internal error
  if (!user) {
    return (
      <div>
        <h1>AuthX</h1>
        <div className="panel">
          {loading ? (
            "Loading..."
          ) : (
            <Fragment>
              {!user ? <div className="error">Unable to load user.</div> : null}
            </Fragment>
          )}
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1>AuthX</h1>
      <div className="panel">
        {loading ? (
          "Loading"
        ) : (
          <div>
            <p>
              Welcome
              {" " + (user && user.name) || ""}!
              <button
                onClick={e => {
                  e.preventDefault();
                  clearAuthorization();
                }}
                type="button"
                style={{
                  background: "hsl(206, 0%, 80%)",
                  color: "hsl(0, 0%, 9%)",
                  borderRadius: "14px",
                  margin: "0 14px"
                }}
              >
                Log Out
              </button>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
