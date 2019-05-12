import React, { ReactElement } from "react";
import ReactDOM from "react-dom";
import { useAuthorization } from "./useAuthorization";
import { useAuthenticatedEndpoint } from "./useAuthenticatedEndpoint";
import { Authenticate } from "./Authenticate";
import { Authorize } from "./Authorize";
import { Default } from "./Default";
import { GraphQL, GraphQLContext } from "graphql-react";

function Root(): ReactElement<{}> {
  const {
    authorization,
    clearAuthorization,
    setAuthorization
  } = useAuthorization();
  const { fetchOptionsOverride } = useAuthenticatedEndpoint(
    authorization,
    clearAuthorization
  );

  // We are not authenticated.
  if (!authorization) {
    return (
      <Authenticate
        fetchOptionsOverride={fetchOptionsOverride}
        setAuthorization={setAuthorization}
      />
    );
  }

  // We need to authorize a client.
  const url = new URL(window.location.href);
  if (url.searchParams.has("response_type")) {
    return (
      <Authorize
        fetchOptionsOverride={fetchOptionsOverride}
        clearAuthorization={clearAuthorization}
      />
    );
  }

  // We need to allow the user to log out.
  return (
    <Default
      fetchOptionsOverride={fetchOptionsOverride}
      clearAuthorization={clearAuthorization}
    />
  );
}

// Instantiate the app.
const graphql = new GraphQL();
document.title = "Authorize";
ReactDOM.render(
  <GraphQLContext.Provider value={graphql}>
    <Root />
  </GraphQLContext.Provider>,
  document.getElementById("root")
);
