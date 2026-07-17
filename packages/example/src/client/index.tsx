import * as React from "react";
import { createRoot } from "react-dom/client";

import { AuthX, Strategy } from "@authx/interface";
import "@authx/interface/authx.css";

import email from "@authx/strategy-email/dist/interface/index.js";
import password from "@authx/strategy-password/dist/interface/index.js";

// Instantiate the app.
document.title = "Authorize";

// Create the AuthX strategies.
const strategies: Strategy[] = [email, password];

const Root = (): React.ReactElement => {
  return <AuthX strategies={strategies} realm="authx" />;
};

// Render the app.
const root = createRoot(document.getElementById("root") as HTMLElement);
root.render(<Root />);
