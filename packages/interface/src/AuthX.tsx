import * as React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactElement } from "react";

import { Root } from "./Root.js";
import { Strategy } from "./Strategy.js";

// Create a client for react-query.
const queryClient = new QueryClient();

export const AuthX = ({
  strategies,
}: {
  strategies: Strategy[];
}): ReactElement => {
  return (
    <QueryClientProvider client={queryClient}>
      <Root strategies={strategies} />
    </QueryClientProvider>
  );
};
