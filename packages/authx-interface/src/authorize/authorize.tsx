import React, {
  Fragment,
  useState,
  useEffect,
  ComponentType,
  ReactElement
} from "react";
import { isSuperset } from "scopeutils";
import ReactDOM from "react-dom";
import { GraphQLContext, GraphQL, useGraphQL } from "graphql-react";
import { useAuthX } from "../authx";

function getRequestedScope(url: URL): null | string[] {
  const param = url.searchParams.get("scope");
  return param ? param.split(" ") : null;
}

function Authorize({  }: {}): ReactElement<any> {
  const { token, fetchOptionsOverride, setToken, clearToken } = useAuthX();

  const url = new URL(window.location.href);
  const responseType = url.searchParams.get("response_type") || null;
  const state = url.searchParams.get("state") || null;
  const clientId = url.searchParams.get("client_id") || null;
  const redirectUri = url.searchParams.get("redirect_uri") || null;
  const requestedScopes = getRequestedScope(url);

  // We are not authenticated, redirect to the authentication page
  if (!token) {
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
    loadOnMount: clientId ? true : false,
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
      variables: { clientId: clientId || "" }
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

  // This is an invalid request
  if (
    responseType !== "code" ||
    !clientId ||
    !redirectUri ||
    (urls && !urls.includes(redirectUri))
  ) {
    if (clientId && redirectUri && urls && urls.includes(redirectUri)) {
      const url = new URL(redirectUri);
      url.searchParams.set("error", "invalid_request");
      if (state) url.searchParams.set("state", state);
      window.location.replace(url.href);
    }
    return (
      <div>
        <h1>Authorize</h1>
        <div className="panel">
          {!clientId ? (
            <div className="error">
              Parameter <span className="code">client_id</span> must be
              specified.
            </div>
          ) : null}
          {!redirectUri ? (
            <div className="error">
              Parameter <span className="code">redirect_uri</span> must be
              specified.
            </div>
          ) : null}
          {redirectUri && urls && !urls.includes(redirectUri) ? (
            <div className="error">
              The specified <span className="code">redirect_uri</span> is not
              registered with the client.
            </div>
          ) : null}
          {responseType !== "code" ? (
            <div className="error">
              Parameter <span className="code">response_type</span> must be set
              to "code".
            </div>
          ) : null}
        </div>
      </div>
    );
  }

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

  // Check that all requested scopes are granted
  const grantedScopes = grant && grant.scopes;
  if (
    grantedScopes &&
    requestedScopes &&
    isSuperset(grantedScopes, requestedScopes)
  ) {
    console.log(grantedScopes, requestedScopes, redirectUri);

    // Check that the return URL is registered with the client
    if (redirectUri && urls && urls.includes(redirectUri)) {
      console.log("TODO: generate a nonce and redirect");
    }
  }

  return (
    <div>
      <h1>Authorize</h1>
      <div className="panel">
        {loading ? (
          "Loading"
        ) : (
          <Fragment>
            "{client.name}" is requesting access to:
            <ul>
              {(requestedScopes &&
                requestedScopes.map((s, i) => (
                  <li key={i}>
                    <pre>{s}</pre>
                  </li>
                ))) ||
                null}
            </ul>
          </Fragment>
        )}

        <div style={{ display: "flex" }}>
          <input
            style={{ flex: "1", marginRight: "7px" }}
            type="button"
            value="Grant Access"
          />
          <input
            onClick={e => {
              e.preventDefault();
              const url = new URL(redirectUri);
              url.searchParams.set("error", "access_denied");
              if (state) url.searchParams.set("state", state);
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

// Instantiate the app
const graphql = new GraphQL();
document.title = "Authorize";
ReactDOM.render(
  <GraphQLContext.Provider value={graphql}>
    <Authorize />
  </GraphQLContext.Provider>,
  document.getElementById("root")
);
