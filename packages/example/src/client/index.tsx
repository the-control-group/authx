import * as React from "react";
import { createRoot } from "react-dom/client";

import { AuthX, Strategy } from "@authx/interface";
import "@authx/interface/authx.css";

import email from "@authx/strategy-email/dist/interface/index.js";
import password from "@authx/strategy-password/dist/interface/index.js";

import { createGraphiQLFetcher } from "@graphiql/toolkit";
import { GraphiQL } from "graphiql";
import "graphiql/style.css";

// Instantiate the app.
document.title = "Authorize";

// Create the AuthX strategies.
const strategies: Strategy[] = [email, password];

const fetcher = createGraphiQLFetcher({
  url: "/graphql",
  headers: {
    get Authorization() {
      const authorization = localStorage.getItem(
        "authx-interface.authorization",
      );
      return authorization ? `Basic ${btoa(authorization)}` : "";
    },
  },
});

const Root = (): React.ReactElement => {
  return window.location.pathname === "/graphiql" ? (
    // On /graphiql, render the GraphiQL editor.
    <GraphiQL fetcher={fetcher} />
  ) : (
    // Otherwise, render the AuthX UI.
    <AuthX strategies={strategies} realm="authx" />
  );
};

// Render the app.
const root = createRoot(document.getElementById("root") as HTMLElement);
root.render(<Root />);
