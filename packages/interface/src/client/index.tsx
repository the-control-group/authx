import React from "react";
import ReactDOM from "react-dom";
import { Root } from "./Root.js";
import { Strategy } from "../Strategy.js";
import { GraphQL, GraphQLContext } from "graphql-react";

declare const __STRATEGIES__: ReadonlyArray<Strategy>;

// Instantiate the app.
const graphql = new GraphQL();
document.title = "Authorize";
ReactDOM.render(
  <GraphQLContext.Provider value={graphql}>
    <Root strategies={__STRATEGIES__} />
  </GraphQLContext.Provider>,
  document.getElementById("root")
);
