import { AuthX, StrategyCollection } from "@authx/authx";
import { readFileSync } from "node:fs";

import email from "@authx/strategy-email";
import password from "@authx/strategy-password";
// import openid from "@authx/strategy-openid";
// import saml from "@authx/strategy-saml";

// Create a new instanciate of AuthX.
export const authx = new AuthX({
  realm: "authx",

  // The base URL for the AuthX server, used for redirects.
  base: `http://localhost${process.env.PORT ? `:${process.env.PORT}` : ""}/`,

  // Set validity durations for various tokens (in seconds).
  codeValidityDuration: 60,
  jwtValidityDuration: 5 * 60,

  // Load the RSA key pair from the file system.
  privateKey: readFileSync("private.pem", "utf8"),
  publicKeys: [readFileSync("public.pem", "utf8")],

  // This is a fake email sender that logs the email to the console.
  async sendMail(options: {
    to: string;
    subject: string;
    text: string;
    html: string;
    from?: string;
  }): Promise<void> {
    console.log("--- SENDING EMAIL MESSAGE -------------------------");
    console.log(options);
  },

  // Provide authentication strategies that are to be available for
  // configuration within AuthX.
  strategies: new StrategyCollection([
    email,
    password, //openid, saml
  ]),

  // The database connection details.
  pg: {
    database: process.env.PGDATABASE ?? undefined,
    host: process.env.PGHOST ?? undefined,
    password: process.env.PGPASSWORD ?? undefined,
    port: process.env.PGPORT ? parseInt(process.env.PGPORT, 10) : undefined,
    ssl: process.env.PGSSL === "true" ? true : false,
    user: process.env.PGUSER ?? undefined,
  },

  // Configs for very primitive internal rate limiter.
  maxRequestsPerMinute: process.env.MAX_REQUESTS_PER_KEY_PER_MINUTE
    ? parseFloat(process.env.MAX_REQUESTS_PER_KEY_PER_MINUTE)
    : null,
});
