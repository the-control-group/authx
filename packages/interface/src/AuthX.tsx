import * as React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactElement } from "react";

import { App } from "./App.js";
import { Strategy } from "./Strategy.js";
export { Strategy };

// Create a client for react-query.
const queryClient = new QueryClient();

export const AuthX = ({
  strategies,
  realm,
}: {
  strategies: Strategy[];
  realm: string;
}): ReactElement => {
  return (
    <div className="authx-interface">
      <QueryClientProvider client={queryClient}>
        <App strategies={strategies} realm={realm} />
      </QueryClientProvider>
    </div>
  );
};
