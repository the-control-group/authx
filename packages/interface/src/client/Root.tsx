import React, { ReactElement } from "react";
import { useAuthorization } from "./useAuthorization";
import { useAuthenticatedEndpoint } from "./useAuthenticatedEndpoint";
import { Authenticate } from "./Authenticate";
import { Authorize } from "./Authorize";
import { Default } from "./Default";
import { Strategy } from "../Strategy";

export function Root({
  strategies
}: {
  strategies: ReadonlyArray<Strategy>;
}): ReactElement {
  const {
    authorization,
    clearAuthorization,
    setAuthorization
  } = useAuthorization();
  const { fetchOptionsOverride } = useAuthenticatedEndpoint(
    authorization,
    clearAuthorization
  );

  return !authorization ? (
    // We are not authenticated.
    <Authenticate
      fetchOptionsOverride={fetchOptionsOverride}
      setAuthorization={setAuthorization}
      strategies={strategies}
    />
  ) : new URL(window.location.href).searchParams.has("response_type") ? (
    // We need to authorize a client.
    <Authorize
      fetchOptionsOverride={fetchOptionsOverride}
      clearAuthorization={clearAuthorization}
    />
  ) : (
    // We need to allow the user to log out.
    <Default
      fetchOptionsOverride={fetchOptionsOverride}
      clearAuthorization={clearAuthorization}
      authorization={authorization}
    />
  );
}
