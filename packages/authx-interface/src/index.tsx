import React, { ReactElement } from "react";
import ReactDOM from "react-dom";
import { useToken } from "./useToken";
import { useAuthenticatedEndpoint } from "./useAuthenticatedEndpoint";
import { Authenticate } from "./Authenticate";
import { Authorize } from "./Authorize";
import { GraphQL, GraphQLContext } from "graphql-react";

function Root(): ReactElement<{}> {
  const { token, clearToken, setToken } = useToken();
  const { fetchOptionsOverride } = useAuthenticatedEndpoint(token, clearToken);

  // We are not authenticated
  if (!token) {
    return (
      <Authenticate
        fetchOptionsOverride={fetchOptionsOverride}
        setToken={setToken}
      />
    );
  }

  // We are authenticated; we need to authorize the client
  return (
    <Authorize
      token={token}
      clearToken={clearToken}
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
