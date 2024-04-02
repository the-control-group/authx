import React, { ReactElement } from "react";
import { useAuthorization } from "./useAuthorization.js";
import { Authenticate } from "./Authenticate.js";
import { Authorize } from "./Authorize.js";
import { Default } from "./Default.js";
import { Strategy } from "./Strategy.js";

export function App({
  strategies,
  realm,
}: {
  strategies: ReadonlyArray<Strategy>;
  realm: string;
}): ReactElement {
  const { authorization, clearAuthorization, setAuthorization } =
    useAuthorization();

  // We are not authenticated.
  if (!authorization) {
    return (
      <Authenticate
        setAuthorization={setAuthorization}
        strategies={strategies}
      />
    );
  }

  // We need to authorize a client.
  if (new URL(window.location.href).searchParams.has("response_type")) {
    return (
      <Authorize
        authorization={authorization}
        clearAuthorization={clearAuthorization}
        realm={realm}
      />
    );
  }

  // We need to allow the user to log out.
  return (
    <Default
      clearAuthorization={clearAuthorization}
      authorization={authorization}
    />
  );
}
