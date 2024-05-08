import test from "ava";
import { URL } from "url";
import { createServer, Server, IncomingMessage } from "http";
import AuthXWebProxy, { Config } from "./index.js";

// These static values are derived as such:
//
// hashScopes(["AuthX:user.equal.self:read.basic"])
//   => JvVNJVB5EzHJcWVP-FqK-nxVIa4
//
// hashScopes([])
//   => 2jmj7l5rSw0yVb_vlWAYkK_YBwk

let mockAuthX: {
  server: Server;
  port: number;
};

let mockTarget: {
  server: Server;
  port: number;
};

let bearerProxy: AuthXWebProxy;
let bearerProxyPort: number;

let basicProxy: AuthXWebProxy;
let basicProxyPort: number;

test.before(async () => {
  const mocks = await Promise.all([
    // Mock an AuthX server.
    new Promise<{
      server: Server;
      port: number;
    }>((resolve, reject) => {
      const server = createServer((request, response) => {
        const chunks: Buffer[] = [];
        request.on("data", (chunk: Buffer) => chunks.push(chunk));
        request.on("error", (error) => {
          throw error;
        });
        request.on("end", () => {
          const requestBody = JSON.parse(
            Buffer.concat(chunks).toString("utf8"),
          );

          response.statusCode = 200;
          response.setHeader("Content-Type", "application/json");
          response.end(
            JSON.stringify({
              /* eslint-disable camelcase */
              access_token:
                requestBody.token_format === "BASIC"
                  ? "NjM3MmRmZjMtMzcwOC00MWMyLWE5ZjQtNjMyZWExNDg1MTZkOjkwNDg5OTExN2M3ZDgwNWE4NGYxM2ZiYzEwNWYxMDhjMDIzMGFhOGM="
                  : "eyJhbGciOiJSUzUxMiIsInR5cCI6IkpXVCJ9.eyJzY29wZXMiOlsiQXV0aFg6dXNlci5lcXVhbC5zZWxmOnJlYWQuYmFzaWMiXSwiaWF0IjoxNTU2NjAzOTU5LCJleHAiOjQ3MTAyMDM5NTksImF1ZCI6ImZlMjQ3OGI1LTdiNjAtNGNlZC1hYWY4LTZjOWI0YTJlNzNmNiIsImlzcyI6ImF1dGh4Iiwic3ViIjoiMTZhNjA3MjItZjcyZi00MmExLTg0ZjgtNWFmODBiYWFjMjg5In0.hB7N3Ibdc-LX9gTkarWPXpjr6gFPRpFVnKND2CXS1XHq6ePzhLIs-Bn3ksHOvkpDzx96z7x_8pQwgHXg_DgUNcpUP-eFuk156wxJ7rpuG5aV-wUmAAg-yLnMjXWx65VUf7J-JvVtRVHlkzahLA1n0drf4Fll-hoTJ6qaOHidUlo",
              refresh_token: "c89900b6a34123900274e90f87f7adc0c1ab8d93",
              expires_in: 3600,
              scope: "AuthX:user.equal.self:read.basic",
              /* eslint-enabme camelcase */
            }),
          );
        });
      });

      server.once("listening", async () => {
        const address = server.address();
        if (!address || typeof address === "string" || !address.port) {
          reject(new Error("No address for mock server."));
          return;
        }

        resolve({ server, port: address.port });
      });

      server.listen(undefined, "localhost");
    }),

    // Mock a target server.
    new Promise<{
      server: Server;
      port: number;
    }>((resolve, reject) => {
      const server = createServer((request, response) => {
        if (
          request.headers.authorization ===
          "Basic YWRhMTJhZDQtYWRmZi00YzU1LTkzOTQtYTAxNWFkZjdlNzE1OmExNjJlZDY2NmRkZmY3NjI1MDQxOTg0ZDI1MGZlYjFkY2YwNWQyNzA="
        ) {
          response.statusCode = 401;
        } else {
          response.statusCode = 200;
        }

        response.setHeader("Content-Type", "application/json");
        response.end(
          JSON.stringify({
            url: request.url,
            cookie: request.headers.cookie,
            Authorization: request.headers.authorization,
          }),
        );
      });

      server.once("listening", async () => {
        const address = server.address();
        if (!address || typeof address === "string" || !address.port) {
          reject(new Error("No address for mock server."));
          return;
        }

        resolve({ server, port: address.port });
      });

      server.listen(undefined, "localhost");
    }),
  ]);

  mockAuthX = mocks[0];
  mockTarget = mocks[1];

  const config: Config = {
    authxUrl: `http://localhost:${mockAuthX.port}`,
    readinessEndpoint: "/_ready",

    // These need to match the values for your client in AuthX.
    clientId: "3ac01e62-faba-4644-b4c0-7979775717ac",
    clientSecret: "279b6f23893778b5edf981867a78a86d60c9bd3d",
    clientUrl: "http://localhost:5734",

    // These are the scopes your client will request from users.
    requestGrantedScopes: ["AuthX:user.equal.self:read.basic"],

    rules: [
      // We want the front-end to be able to access the AuthX API without managing
      // credentials. To do this, we create a proxy that injects a token with all
      // the necessary scopes and nothing more.
      {
        test({ method, url }) {
          return method === "POST" && url === "/api/authx";
        },
        behavior(request: IncomingMessage) {
          // Rewrite the URL to match the API's expectations.
          request.url = "/graphql";

          // Because this is an API request, we don't want to redirect the browser
          // so we will return a 401 and include a `Location` header which the
          // front-end can use to redirect the user.
          return {
            proxyOptions: { target: `http://localhost:${mockTarget.port}` },
            sendAuthorizationResponseAs: 401,
            sendTokenToTargetWithScopes: ["authx.prod:**:**"],
          };
        },
      },
      // These are static assets that we want publically cached by Google Cloud
      // CDN or Cloudflare. We won't require any auth for these endpoints.
      {
        test({ method, url }) {
          return method === "GET" && /^\/static(\/.*)?$/.test(url || "");
        },
        behavior: {
          proxyOptions: { target: `http://localhost:${mockTarget.port}` },
        },
      },
      // The rest of our routes render a single-page-app. We simply want to make
      // sure that we're
      {
        test() {
          return true;
        },

        // These requests are likely made directly by the user, so we can simply
        // redirect the user if we require more granted priviliges. Additionally,
        // we don't need to generate a token for this target, so we can leave off
        // `sendTokenToTargetWithScopes`. However, we still do want to ensure that
        // the user is authenticated and has granted us scopes that are necessary
        // for the app to work, so we will set `requireGrantedScopes`.
        behavior: {
          proxyOptions: { target: `http://localhost:${mockTarget.port}` },
          sendAuthorizationResponseAs: 303,
          sendTokenToTargetWithScopes: [],
        },
      },
    ],
  };

  // Set up the bearer proxy.
  bearerProxy = new AuthXWebProxy({ ...config, tokenFormat: "BEARER" });
  await bearerProxy.listen({ port: 0, host: "localhost" });
  const bearerAddress = bearerProxy.server.address();
  if (
    !bearerAddress ||
    typeof bearerAddress === "string" ||
    !bearerAddress.port
  ) {
    throw new Error("No address for mock server.");
  }
  bearerProxyPort = bearerAddress.port;

  // Set up the basic proxy.
  basicProxy = new AuthXWebProxy({ ...config, tokenFormat: "BASIC" });
  await basicProxy.listen({ port: 0, host: "localhost" });
  const basicAddress = basicProxy.server.address();
  if (!basicAddress || typeof basicAddress === "string" || !basicAddress.port) {
    throw new Error("No address for mock server.");
  }
  basicProxyPort = basicAddress.port;
});

test.after(async () => {
  await Promise.all([
    bearerProxy.close(),
    basicProxy.close(),
    new Promise((resolve) => mockAuthX.server.close(resolve)),
    new Promise((resolve) => mockTarget.server.close(resolve)),
  ]);
});

test("readiness endpoint", async (t) => {
  const response = await fetch(`http://localhost:${bearerProxyPort}/_ready`);
  t.is(response.status, 200);
  t.is(await response.text(), "READY");
});

test("anonymous - 401", async (t) => {
  const response = await fetch(
    `http://localhost:${bearerProxyPort}/api/authx`,
    {
      method: "POST",
      redirect: "manual",
      headers: {
        referer: "/foo",
      },
    },
  );
  t.is(response.status, 401);
  const location = response.headers.get("Location");
  t.assert(location, "Location header must be in response.");
  const url = new URL(location || "");
  t.is(url.origin, `http://localhost:${mockAuthX.port}`);
  t.is([...url.searchParams].length, 5);
  t.is(url.searchParams.get("response_type"), "code");
  t.is(
    url.searchParams.get("client_id"),
    "3ac01e62-faba-4644-b4c0-7979775717ac",
  );
  t.is(url.searchParams.get("redirect_uri"), "http://localhost:5734");
  t.is(url.searchParams.get("scope"), "AuthX:user.equal.self:read.basic");
  t.assert(url.searchParams.get("state"), "State must be set.");

  // Sets cookies:
  // - authx.s = state
  // - authx.d = referer (since this is a POST request)
  t.is(
    response.headers.get("set-cookie"),
    `authx.s=${
      url.searchParams.get("state") || ""
    }; path=/; httponly, authx.d=/foo; path=/; httponly`,
  );
});

test("anonymous - 200", async (t) => {
  const response = await fetch(
    `http://localhost:${bearerProxyPort}/static/logo`,
    {
      redirect: "manual",
    },
  );
  t.is(response.status, 200);
});

test("anonymous - 303", async (t) => {
  const response = await fetch(`http://localhost:${bearerProxyPort}/admin`, {
    redirect: "manual",
  });
  t.is(response.status, 303);
  const location = response.headers.get("Location");
  t.assert(location, "Location header must be in response.");
  const url = new URL(location || "");
  t.is(url.origin, `http://localhost:${mockAuthX.port}`);
  t.is([...url.searchParams].length, 5);
  t.is(url.searchParams.get("response_type"), "code");
  t.is(
    url.searchParams.get("client_id"),
    "3ac01e62-faba-4644-b4c0-7979775717ac",
  );
  t.is(url.searchParams.get("redirect_uri"), "http://localhost:5734");
  t.is(url.searchParams.get("scope"), "AuthX:user.equal.self:read.basic");
  t.assert(url.searchParams.get("state"), "State must be set.");

  // Sets cookies:
  // - authx.s = state
  // - authx.d = referer (since this is a POST request)
  t.is(
    response.headers.get("set-cookie"),
    `authx.s=${
      url.searchParams.get("state") || ""
    }; path=/; httponly, authx.d=/admin; path=/; httponly`,
  );
});

test("use token from cookie (bearer)", async (t) => {
  const headers = new Headers();
  headers.append("cookie", "authx.r=9a64774762a4cdece006b0007e7795eaa1709a34");
  headers.append(
    "cookie",
    `authx.t.2jmj7l5rSw0yVb_vlWAYkK_YBwk=eyJhbGciOiJSUzUxMiIsInR5cCI6IkpXVCJ9.eyJzY29wZXMiOltdLCJpYXQiOjE1NTY2MDMxMTAsImV4cCI6NDcxMDIwMzExMCwiYXVkIjoiZmUyNDc4YjUtN2I2MC00Y2VkLWFhZjgtNmM5YjRhMmU3M2Y2IiwiaXNzIjoiYXV0aHgiLCJzdWIiOiIxNmE2MDcyMi1mNzJmLTQyYTEtODRmOC01YWY4MGJhYWMyODkifQ.GEd75BHZP3c4NGv3te9bDLQ9hPV0B6lFxydfuBw-4k9KNP5330xQjrAY4Wu-S9thAGS2cXfHyFWR2cKfBDDno6_NivSJHszBs_ErDSAHCJsZ4Ej1VJmPXpePfXbdAmMd6Ug6dEsmmV1lO_gpICHqnVwj2KWGUPvwbN7VVdufy7g`,
  );
  const response = await fetch(`http://localhost:${bearerProxyPort}/admin`, {
    redirect: "manual",
    headers,
  });

  t.is(response.status, 200);
  t.false(response.headers.has("set-cookie"));

  t.deepEqual(await response.json(), {
    url: "/admin",
    Authorization:
      "Bearer eyJhbGciOiJSUzUxMiIsInR5cCI6IkpXVCJ9.eyJzY29wZXMiOltdLCJpYXQiOjE1NTY2MDMxMTAsImV4cCI6NDcxMDIwMzExMCwiYXVkIjoiZmUyNDc4YjUtN2I2MC00Y2VkLWFhZjgtNmM5YjRhMmU3M2Y2IiwiaXNzIjoiYXV0aHgiLCJzdWIiOiIxNmE2MDcyMi1mNzJmLTQyYTEtODRmOC01YWY4MGJhYWMyODkifQ.GEd75BHZP3c4NGv3te9bDLQ9hPV0B6lFxydfuBw-4k9KNP5330xQjrAY4Wu-S9thAGS2cXfHyFWR2cKfBDDno6_NivSJHszBs_ErDSAHCJsZ4Ej1VJmPXpePfXbdAmMd6Ug6dEsmmV1lO_gpICHqnVwj2KWGUPvwbN7VVdufy7g",
  });
});

test("use token from cookie (basic, valid)", async (t) => {
  const headers = new Headers();
  headers.append("cookie", "authx.r=9a64774762a4cdece006b0007e7795eaa1709a34");
  headers.append(
    "cookie",
    `authx.t.2jmj7l5rSw0yVb_vlWAYkK_YBwk=ODNkY2VmYzUtZWIyYi00YTJhLTk1NjMtYjJmZjJmMjEyYzYwOjRmOTk1YTdiMjQzNWNhNWM5YjZjNTQ3MGVjNTZhMjZiYjY4MzMyM2E=`,
  );
  const response = await fetch(`http://localhost:${basicProxyPort}/admin`, {
    redirect: "manual",
    headers,
  });

  t.is(response.status, 200);
  t.false(response.headers.has("set-cookie"));

  t.deepEqual(await response.json(), {
    url: "/admin",
    Authorization:
      "Basic ODNkY2VmYzUtZWIyYi00YTJhLTk1NjMtYjJmZjJmMjEyYzYwOjRmOTk1YTdiMjQzNWNhNWM5YjZjNTQ3MGVjNTZhMjZiYjY4MzMyM2E=",
  });
});

test("use token from cookie (basic, invalid)", async (t) => {
  const headers = new Headers();
  headers.append("cookie", "authx.r=9a64774762a4cdece006b0007e7795eaa1709a34");
  headers.append(
    "cookie",
    `authx.t.2jmj7l5rSw0yVb_vlWAYkK_YBwk=YWRhMTJhZDQtYWRmZi00YzU1LTkzOTQtYTAxNWFkZjdlNzE1OmExNjJlZDY2NmRkZmY3NjI1MDQxOTg0ZDI1MGZlYjFkY2YwNWQyNzA=`,
  );
  const response = await fetch(`http://localhost:${basicProxyPort}/admin`, {
    redirect: "manual",
    headers,
  });

  t.is(response.status, 401);
  t.is(
    response.headers.get("set-cookie"),
    "authx.t.2jmj7l5rSw0yVb_vlWAYkK_YBwk=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; httponly",
  );

  t.deepEqual(await response.json(), {
    url: "/admin",
    Authorization:
      "Basic YWRhMTJhZDQtYWRmZi00YzU1LTkzOTQtYTAxNWFkZjdlNzE1OmExNjJlZDY2NmRkZmY3NjI1MDQxOTg0ZDI1MGZlYjFkY2YwNWQyNzA=",
  });
});

test("fetch token from authx (bearer)", async (t) => {
  const headers = new Headers();
  headers.append("cookie", "authx.r=9a64774762a4cdece006b0007e7795eaa1709a34");
  headers.append(
    "cookie",
    `authx.t.2jmj7l5rSw0yVb_vlWAYkK_YBwk=eyJhbGciOiJSUzUxMiIsInR5cCI6IkpXVCJ9.eyJzY29wZXMiOltdLCJpYXQiOjE1NTY2MDMxMTAsImV4cCI6NDcxMDIwMzExMCwiYXVkIjoiZmUyNDc4YjUtN2I2MC00Y2VkLWFhZjgtNmM5YjRhMmU3M2Y2IiwiaXNzIjoiYXV0aHgiLCJzdWIiOiIxNmE2MDcyMi1mNzJmLTQyYTEtODRmOC01YWY4MGJhYWMyODkifQ.GEd75BHZP3c4NGv3te9bDLQ9hPV0B6lFxydfuBw-4k9KNP5330xQjrAY4Wu-S9thAGS2cXfHyFWR2cKfBDDno6_NivSJHszBs_ErDSAHCJsZ4Ej1VJmPXpePfXbdAmMd6Ug6dEsmmV1lO_gpICHqnVwj2KWGUPvwbN7VVdufy7g`,
  );
  const response = await fetch(
    `http://localhost:${bearerProxyPort}/api/authx`,
    {
      method: "POST",
      redirect: "manual",
      headers,
    },
  );

  t.is(response.status, 200);
  t.is(
    response.headers.get("set-cookie"),
    "authx.r=c89900b6a34123900274e90f87f7adc0c1ab8d93; path=/; httponly, authx.t.JvVNJVB5EzHJcWVP-FqK-nxVIa4=eyJhbGciOiJSUzUxMiIsInR5cCI6IkpXVCJ9.eyJzY29wZXMiOlsiQXV0aFg6dXNlci5lcXVhbC5zZWxmOnJlYWQuYmFzaWMiXSwiaWF0IjoxNTU2NjAzOTU5LCJleHAiOjQ3MTAyMDM5NTksImF1ZCI6ImZlMjQ3OGI1LTdiNjAtNGNlZC1hYWY4LTZjOWI0YTJlNzNmNiIsImlzcyI6ImF1dGh4Iiwic3ViIjoiMTZhNjA3MjItZjcyZi00MmExLTg0ZjgtNWFmODBiYWFjMjg5In0.hB7N3Ibdc-LX9gTkarWPXpjr6gFPRpFVnKND2CXS1XHq6ePzhLIs-Bn3ksHOvkpDzx96z7x_8pQwgHXg_DgUNcpUP-eFuk156wxJ7rpuG5aV-wUmAAg-yLnMjXWx65VUf7J-JvVtRVHlkzahLA1n0drf4Fll-hoTJ6qaOHidUlo; path=/; httponly",
  );
  t.deepEqual(await response.json(), {
    url: "/graphql",
    Authorization:
      "Bearer eyJhbGciOiJSUzUxMiIsInR5cCI6IkpXVCJ9.eyJzY29wZXMiOlsiQXV0aFg6dXNlci5lcXVhbC5zZWxmOnJlYWQuYmFzaWMiXSwiaWF0IjoxNTU2NjAzOTU5LCJleHAiOjQ3MTAyMDM5NTksImF1ZCI6ImZlMjQ3OGI1LTdiNjAtNGNlZC1hYWY4LTZjOWI0YTJlNzNmNiIsImlzcyI6ImF1dGh4Iiwic3ViIjoiMTZhNjA3MjItZjcyZi00MmExLTg0ZjgtNWFmODBiYWFjMjg5In0.hB7N3Ibdc-LX9gTkarWPXpjr6gFPRpFVnKND2CXS1XHq6ePzhLIs-Bn3ksHOvkpDzx96z7x_8pQwgHXg_DgUNcpUP-eFuk156wxJ7rpuG5aV-wUmAAg-yLnMjXWx65VUf7J-JvVtRVHlkzahLA1n0drf4Fll-hoTJ6qaOHidUlo",
  });
});

test("fetch token from authx (basic)", async (t) => {
  const headers = new Headers();
  headers.append("cookie", "authx.r=9a64774762a4cdece006b0007e7795eaa1709a34");
  headers.append(
    "cookie",
    `authx.t.2jmj7l5rSw0yVb_vlWAYkK_YBwk=ODNkY2VmYzUtZWIyYi00YTJhLTk1NjMtYjJmZjJmMjEyYzYwOjRmOTk1YTdiMjQzNWNhNWM5YjZjNTQ3MGVjNTZhMjZiYjY4MzMyM2E=`,
  );
  const response = await fetch(`http://localhost:${basicProxyPort}/api/authx`, {
    method: "POST",
    redirect: "manual",
    headers,
  });

  t.is(response.status, 200);
  t.is(
    response.headers.get("set-cookie"),
    "authx.r=c89900b6a34123900274e90f87f7adc0c1ab8d93; path=/; httponly, authx.t.JvVNJVB5EzHJcWVP-FqK-nxVIa4=NjM3MmRmZjMtMzcwOC00MWMyLWE5ZjQtNjMyZWExNDg1MTZkOjkwNDg5OTExN2M3ZDgwNWE4NGYxM2ZiYzEwNWYxMDhjMDIzMGFhOGM=; path=/; httponly",
  );
  t.deepEqual(await response.json(), {
    url: "/graphql",
    Authorization:
      "Basic NjM3MmRmZjMtMzcwOC00MWMyLWE5ZjQtNjMyZWExNDg1MTZkOjkwNDg5OTExN2M3ZDgwNWE4NGYxM2ZiYzEwNWYxMDhjMDIzMGFhOGM=",
  });
});

test("does not proxy an invalid URL", async (t) => {
  const response = await fetch(
    `http://localhost:${bearerProxyPort}//?this_is_invalid`,
    {
      redirect: "manual",
    },
  );
  t.is(response.status, 400);
  t.regex(await response.text(), /The URL provided is invalid\./);
});
