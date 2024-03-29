import React, { ReactElement } from "react";
import { useAuthorization } from "./useAuthorization.js";
import { Authenticate } from "./Authenticate.js";
// import { Authorize } from "./Authorize.js";
// import { Default } from "./Default.js";
import { Strategy } from "./Strategy.js";

export function Root({
  strategies,
}: {
  strategies: ReadonlyArray<Strategy>;
}): ReactElement {
  // const query = useQuery({ queryKey: ['todos'], queryFn: getTodos })

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

  // // We need to authorize a client.
  // if (new URL(window.location.href).searchParams.has("response_type")) {
  //   return <Authorize clearAuthorization={clearAuthorization} />;
  // }

  // // We need to allow the user to log out.
  // return (
  //   <Default
  //     clearAuthorization={clearAuthorization}
  //     authorization={authorization}
  //   />
  // );

  return <div>Root</div>;
}
