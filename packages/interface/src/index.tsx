import React, { ReactElement } from "react";
import ReactDOM from "react-dom";
import { useAuthorization } from "./useAuthorization";
import { useAuthenticatedEndpoint } from "./useAuthenticatedEndpoint";
import { Authenticate } from "./Authenticate";
import { Authorize } from "./Authorize";
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

  // We are not authenticated
  if (!authorization) {
    return (
      <Authenticate
        fetchOptionsOverride={fetchOptionsOverride}
        setAuthorization={setAuthorization}
      />
    );
  }

  // We are authenticated; we need to authorize the client
  return (
    <Authorize
      authorization={authorization}
      clearAuthorization={clearAuthorization}
      fetchOptionsOverride={fetchOptionsOverride}
    />
  );
}

// Instantiate the app
const graphql = new GraphQL();
document.title = "Authorize";
ReactDOM.render(
  <GraphQLContext.Provider value={graphql}>
    <Root />
  </GraphQLContext.Provider>,
  document.getElementById("root")
);
