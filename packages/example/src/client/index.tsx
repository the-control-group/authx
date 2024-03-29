import * as React from "react";
import { createRoot } from "react-dom/client";

import { AuthX } from "@authx/interface/dist/AuthX.js";
import { Strategy } from "@authx/interface/dist/Strategy.js";

import email from "@authx/strategy-email/dist/interface/index.js";
import password from "@authx/strategy-password/dist/interface/index.js";

// Instantiate the app.
document.title = "Authorize";

// Create the strategies.
const strategies: Strategy[] = [email, password];

// Render the app.
const root = createRoot(document.getElementById("root") as HTMLElement);
root.render(<AuthX strategies={strategies} />);
