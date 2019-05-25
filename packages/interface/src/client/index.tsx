import React from "react";
import ReactDOM from "react-dom";
import { Root } from "./Root";
import { Strategy } from "../Strategy";
import { GraphQL, GraphQLContext } from "graphql-react";

declare var __STRATEGIES__: ReadonlyArray<Strategy>;

const strategies = __STRATEGIES__.reduce<{ [name: string]: Strategy }>(
  (map, strategy) => {
    const match = strategy.fragment.match(
      /^\s*fragment\s+([A-Z][A-Za-z0-9_]*)/
    );
    if (!match || !match[1]) {
      throw new Error(
        `INVARIANT: Failed to extract fragment name from:\n${strategy.fragment}`
      );
    }
    map[match[1]] = strategy;

    return map;
  },
  {}
);

// Instantiate the app.
const graphql = new GraphQL();
document.title = "Authorize";
ReactDOM.render(
  <GraphQLContext.Provider value={graphql}>
    <Root strategies={strategies} />
  </GraphQLContext.Provider>,
  document.getElementById("root")
);
