import React, { useState, useEffect, ComponentType, ReactElement } from "react";
import { isSuperset } from "scopeutils";
import ReactDOM from "react-dom";
import { GraphQLContext, GraphQL, useGraphQL } from "graphql-react";
import { useAuthX } from "../authx";

function Authorize({  }: {}): ReactElement<any> {
  const { token, fetchOptionsOverride, setToken, clearToken } = useAuthX();

  const url = new URL(window.location.href);
  const clientId = url.searchParams.get("client_id") || null;
  const redirectUri = url.searchParams.get("redirect_uri") || null;
  const requestedScopes = (
    url.searchParams.get("scope") || { split: () => [] }
  ).split(" ");

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
              oauth2Urls: string[];
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
                  oauth2Urls
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

  // Check that all requested scopes are granted
  const grantedScopes = grant && grant.scopes;
  if (grantedScopes && isSuperset(grantedScopes, requestedScopes)) {
    // Check that the return URL is registered with the client
    const oauth2Urls = client && client.oauth2Urls;
    if (redirectUri && oauth2Urls && oauth2Urls.includes(redirectUri)) {
      const url = new URL(redirectUri);
      window.location.replace(url.href);
    }
  }

  return (
    <div>
      <h1>Authorize</h1>
      <div className="panel">
        {loading
          ? "Loading"
          : !user
          ? "Unable to load user"
          : !grant
          ? "Unable to load grant"
          : null}
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
