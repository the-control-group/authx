import React, {
  Fragment,
  ReactElement,
  useEffect,
  useContext,
  useState
} from "react";
import {
  GraphQL,
  useGraphQL,
  GraphQLFetchOptionsOverride,
  GraphQLContext
} from "graphql-react";
import { validate, isSuperset } from "@authx/scopes";

export function Authorize({
  authorization,
  clearAuthorization,
  fetchOptionsOverride
}: {
  authorization: { id: string; secret: string };
  clearAuthorization: () => void;
  fetchOptionsOverride: GraphQLFetchOptionsOverride;
}): ReactElement<any> {
  const url = new URL(window.location.href);

  const paramsResponseType = url.searchParams.get("response_type") || null;
  const paramsState = url.searchParams.get("state") || null;
  const paramsClientId = url.searchParams.get("client_id") || null;
  const paramsRedirectUri = url.searchParams.get("redirect_uri") || null;
  const paramsScope = url.searchParams.get("scope") || null;

  // Parse the scopes
  const requestedScopes = paramsScope ? paramsScope.split(" ") : null;
  const requestedScopesAreValid = requestedScopes
    ? requestedScopes.every(validate)
    : null;

  // We are not authenticated, redirect to the authentication page
  if (!authorization) {
    const url = new URL(window.location.href);
    const segments = url.pathname.split("/");
    url.pathname = [
      ...segments.slice(0, segments.length - 2),
      "authenticate",
      ""
    ].join("/");

    window.location.replace(url.href);
  }

  // Get all active authorities from the API.
  const { loading, cacheValue } = useGraphQL<
    {
      viewer: null | {
        user: null | {
          id: string;
          contact: null | {
            displayName: string;
          };
          grant: null | {
            id: string;
            scopes: null | string[];
            client: null | {
              name: string;
              urls: string[];
            };
          };
        };
      };
    },
    { clientId: string }
  >({
    fetchOptionsOverride,
    loadOnMount: paramsClientId ? true : false,
    operation: {
      query: `
        query($clientId: ID!) {
          viewer {
            user {
              contact {
                displayName
              }
              grant(clientId: $clientId) {
                id
                scopes
                client {
                  name
                  urls
                }
              }
            }
          }
        }
      `,
      variables: { clientId: paramsClientId || "" }
    }
  });

  const user =
    cacheValue &&
    cacheValue.data &&
    cacheValue.data.viewer &&
    cacheValue.data.viewer.user;
  const grant = user && user.grant;
  const client = grant && grant.client;
  const urls = client && client.urls;

  // API and errors
  const graphql = useContext<GraphQL>(GraphQLContext);
  const [errors, setErrors] = useState<string[]>([]);
  async function onGrantAccess(): Promise<void> {
    if (!grant || !paramsRedirectUri) return;

    const operation = graphql.operate<
      {
        updateGrant: null | {
          codes: null | string[];
          scopes: null | string[];
        };
      },
      {
        id: string;
        scopes: string[];
      }
    >({
      fetchOptionsOverride,
      operation: {
        query: `
          mutation($id: ID!, $scopes: [String!]!) {
            updateGrant(id: $id, scopes: $scopes, generateCodes: 1) {
              codes
              scopes
            }
          }
        `,
        variables: {
          id: grant.id,
          scopes: [...(grant.scopes || []), ...(requestedScopes || [])]
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

      const code =
        (result.data &&
          result.data.updateGrant &&
          result.data.updateGrant.codes &&
          [...result.data.updateGrant.codes].sort().reverse()[0]) ||
        null;

      if (!code) {
        setErrors([
          "No code was returned. Contact your administrator to ensure you have sufficient access to read your own authorizations and authorization secrets."
        ]);
        return;
      }

      // We have successfully authenticated!
      // Zero the error.
      setErrors([]);

      // Redirect
      const url = new URL(paramsRedirectUri);
      if (paramsState) url.searchParams.set("state", paramsState);
      url.searchParams.set("code", code);
      window.location.replace(url.href);
    } catch (error) {
      setErrors([error.message]);
      return;
    }
  }

  useEffect(() => {
    // Make sure we're ready and it's safe to redirect the user
    if (
      paramsClientId &&
      paramsRedirectUri &&
      urls &&
      urls.includes(paramsRedirectUri)
    ) {
      const url = new URL(paramsRedirectUri);
      if (paramsState) url.searchParams.set("state", paramsState);

      if (paramsResponseType !== "code") {
        url.searchParams.append("error", "unsupported_response_type");
        url.searchParams.append(
          "error_description",
          'The `response_type` must be set to "code".'
        );
      }

      if (requestedScopesAreValid === false) {
        url.searchParams.append("error", "invalid_scope ");
        url.searchParams.append(
          "error_description",
          "If set, the `scope` must be contain a space-separated list of valid authx scopes."
        );
      }

      // We have an error to redirect
      if (url.searchParams.has("error")) {
        window.location.replace(url.href);
        return;
      }

      // Check that all requested scopes are already granted
      const grantedScopes = grant && grant.scopes;
      if (
        grantedScopes &&
        requestedScopes &&
        isSuperset(grantedScopes, requestedScopes)
      ) {
        // console.log("TODO: generate a nonce and redirect");
      }
    }
  }, [
    paramsClientId,
    paramsRedirectUri,
    urls,
    paramsState,
    paramsResponseType,
    requestedScopes,
    requestedScopesAreValid,
    grant
  ]);

  // This is an invalid request
  if (
    !paramsClientId ||
    !paramsRedirectUri ||
    (urls && !urls.includes(paramsRedirectUri)) ||
    paramsResponseType !== "code" ||
    requestedScopesAreValid === false
  ) {
    return (
      <div>
        <h1>Authorize</h1>
        <div className="panel">
          {!paramsClientId ? (
            <div className="error">
              Parameter <span className="code">client_id</span> must be
              specified.
            </div>
          ) : null}
          {!paramsRedirectUri ? (
            <div className="error">
              Parameter <span className="code">redirect_uri</span> must be
              specified.
            </div>
          ) : null}
          {paramsRedirectUri && urls && !urls.includes(paramsRedirectUri) ? (
            <div className="error">
              The specified <span className="code">redirect_uri</span> is not
              registered with the client.
            </div>
          ) : null}
          {paramsResponseType !== "code" ? (
            <div className="error">
              Parameter <span className="code">response_type</span> must be set
              to &quot;code&quot;.
            </div>
          ) : null}
          {requestedScopesAreValid === false ? (
            <div className="error">
              If set, the <span className="code">scope</span> must be contain a
              space-separated list of valid authx scopes.
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  // Internal error
  if (!user || !grant || !client) {
    return (
      <div>
        <h1>Authorize</h1>
        <div className="panel">
          {loading ? (
            "Loading..."
          ) : (
            <Fragment>
              {!user ? <div className="error">Unable to load user.</div> : null}
              {user && !grant ? (
                <div className="error">
                  Unable to load grant. Make sure you have access to read your
                  own grants.
                </div>
              ) : null}
              {user && grant && !client ? (
                <div className="error">
                  Unable to load client. Make sure you have access to read
                  clients.
                </div>
              ) : null}
            </Fragment>
          )}
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1>Authorize</h1>
      <div className="panel">
        {loading ? (
          "Loading"
        ) : (
          <div>
            <p>
              Welcome
              {user && user.contact ? ` ${user.contact.displayName}` : ""}!
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

            <p>
              The app &quot;{client.name}&quot; is requesting access to the
              following scopes:
            </p>
            <div className="info">
              <ul>
                {(requestedScopes &&
                  requestedScopes.map((s, i) => (
                    <li key={i}>
                      <pre>{s}</pre>
                    </li>
                  ))) ||
                  null}
              </ul>
            </div>
          </div>
        )}

        {errors.length
          ? errors.map((error, i) => (
              <p key={i} className="error">
                {error}
              </p>
            ))
          : null}

        <div style={{ display: "flex", margin: "14px" }}>
          <input
            onClick={e => {
              e.preventDefault();
              onGrantAccess();
            }}
            style={{ flex: "1", marginRight: "14px" }}
            type="button"
            value="Grant Access"
          />
          <input
            onClick={e => {
              e.preventDefault();
              const url = new URL(paramsRedirectUri);
              url.searchParams.set("error", "access_denied");
              if (paramsState) url.searchParams.set("state", paramsState);
              window.location.replace(url.href);
            }}
            className="danger"
            style={{ flex: "1", marginLeft: "7px" }}
            type="button"
            value="Deny"
          />
        </div>
      </div>
    </div>
  );
}
