import test from "ava";
import { URL } from "url";

import { createServer, Server, IncomingMessage } from "http";
import AuthXClientProxy from ".";
import fetch from "node-fetch";

let mockAuthX: {
  server: Server;
  port: number;
  enable: () => void;
};

let mockTarget: {
  server: Server;
  port: number;
};

let proxy: AuthXClientProxy;
let port: number;

test.before(async () => {
  const mocks = await Promise.all([
    // Mock an AuthX server.
    new Promise<{
      server: Server;
      port: number;
      enable: () => void;
    }>((resolve, reject) => {
      let queue: null | (() => void)[] = [];
      function enable(): void {
        if (queue) queue.forEach(r => r());
        queue = null;
      }
      const server = createServer((request, response) => {
        const r = (): void => {
          response.statusCode = 200;
          response.setHeader("Content-Type", "application/json");
          response.end(
            '{"query": {"keys": ["-----BEGIN PUBLIC KEY-----\\nMIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQCfb+nyTPFCntEXbrFPU5DeE0gC\\n4jXRcSFWDfCRgeqeQWqIW9DeMmCj13k0z6fQCiG3FATYosS64wAs+OiyGtu9q/Jy\\nUEVIBMF0upDJMA53AFFx+0Fb/i76JFPTY7SxzvioIFeKRwY8evIRWQWYO95Os6gK\\nBac/x5qiUn5fh2xM+wIDAQAB\\n-----END PUBLIC KEY-----"]}}'
          );
        };

        if (queue) queue.push(r);
        else r();
      });

      server.once("listening", async () => {
        const address = server && server.address();
        if (!address || typeof address === "string" || !address.port) {
          reject(new Error("No address for mock server."));
          return;
        }

        resolve({ server, port: address.port, enable });
      });

      server.listen();
    }),

    // Mock a target server.
    new Promise<{
      server: Server;
      port: number;
    }>((resolve, reject) => {
      const server = createServer((request, response) => {
        response.statusCode = 200;
        response.setHeader("Content-Type", "application/json");
        response.end(
          JSON.stringify({
            url: request.url,
            Authorization: request.headers.authorization,
            "X-OAuth-Scopes": request.headers["x-oauth-scopes"],
            "X-OAuth-Required-Scopes":
              request.headers["x-oauth-required-scopes"]
          })
        );
      });

      server.once("listening", async () => {
        const address = server && server.address();
        if (!address || typeof address === "string" || !address.port) {
          reject(new Error("No address for mock server."));
          return;
        }

        resolve({ server, port: address.port });
      });

      server.listen();
    })
  ]);

  mockAuthX = mocks[0];
  mockTarget = mocks[1];

  proxy = new AuthXClientProxy({
    authxUrl: `http://127.0.0.1:${mockAuthX.port}`,
    readinessUrl: "/_ready",

    // These need to match the values for your client in AuthX.
    clientId: "3ac01e62-faba-4644-b4c0-7979775717ac",
    clientSecret: "279b6f23893778b5edf981867a78a86d60c9bd3d",
    clientUrl: "http://127.0.0.1:5734",

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
          request.url = "/v2/graphql";

          // Because this is an API request, we don't want to redirect the browser
          // so we will return a 407 and include a `Location` header which the
          // front-end can use to redirect the user.
          return {
            proxyTarget: `http://127.0.0.1:${mockTarget.port}`,
            sendAuthorizationResponseAs: 407,
            sendTokenToTargetWithScopes: ["authx.prod:**:**"]
          };
        }
      },
      // These are static assets that we want publically cached by Google Cloud
      // CDN or Cloudflare. We won't require any auth for these endpoints.
      {
        test({ method, url }) {
          return method === "GET" && /^\/static(\/.*)?$/.test(url || "");
        },
        behavior: {
          proxyTarget: `http://127.0.0.1:${mockTarget.port}`
        }
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
          proxyTarget: `http://127.0.0.1:${mockTarget.port}`,
          sendAuthorizationResponseAs: 303,
          sendTokenToTargetWithScopes: []
        }
      }
    ]
  });

  await proxy.listen(5734);
  const address = proxy && proxy.server.address();
  if (!address || typeof address === "string" || !address.port) {
    throw new Error("No address for mock server.");
  }

  port = address.port;
});

test("readiness endpoint", async t => {
  const response = await fetch(`http://127.0.0.1:${port}/_ready`);
  t.is(response.status, 200);
  t.is(await response.text(), "READY");
});

test("anonymous - 407", async t => {
  const response = await fetch(`http://127.0.0.1:${port}/api/authx`, {
    method: "POST",
    headers: {
      referer: "/foo"
    }
  });
  t.is(response.status, 407);
  const location = response.headers.get("Location");
  t.assert(location, "Location header must be in response.");
  const url = new URL(location || "");
  t.is(url.origin, `http://127.0.0.1:${mockAuthX.port}`);
  t.is([...url.searchParams].length, 5);
  t.is(url.searchParams.get("response_type"), "code");
  t.is(
    url.searchParams.get("client_id"),
    "3ac01e62-faba-4644-b4c0-7979775717ac"
  );
  t.is(url.searchParams.get("redirect_uri"), "http://127.0.0.1:5734");
  t.is(url.searchParams.get("scope"), "AuthX:user.equal.self:read.basic");
  t.assert(url.searchParams.get("state"), "State must be set.");

  // Sets cookies:
  // - authx.s = state
  // - authx.d = referer (since this is a POST request)
  t.is(
    response.headers.get("set-cookie"),
    `authx.s=${url.searchParams.get("state") ||
      ""}; path=/; httponly, authx.d=/foo; path=/; httponly`
  );
});

test("anonymous - 200", async t => {
  const response = await fetch(`http://127.0.0.1:${port}/static/logo`, {
    redirect: "manual"
  });
  t.is(response.status, 200);
});

test("anonymous - 303", async t => {
  const response = await fetch(`http://127.0.0.1:${port}/admin`, {
    redirect: "manual"
  });
  t.is(response.status, 303);
  const location = response.headers.get("Location");
  t.assert(location, "Location header must be in response.");
  const url = new URL(location || "");
  t.is(url.origin, `http://127.0.0.1:${mockAuthX.port}`);
  t.is([...url.searchParams].length, 5);
  t.is(url.searchParams.get("response_type"), "code");
  t.is(
    url.searchParams.get("client_id"),
    "3ac01e62-faba-4644-b4c0-7979775717ac"
  );
  t.is(url.searchParams.get("redirect_uri"), "http://127.0.0.1:5734");
  t.is(url.searchParams.get("scope"), "AuthX:user.equal.self:read.basic");
  t.assert(url.searchParams.get("state"), "State must be set.");

  // Sets cookies:
  // - authx.s = state
  // - authx.d = referer (since this is a POST request)
  t.is(
    response.headers.get("set-cookie"),
    `authx.s=${url.searchParams.get("state") ||
      ""}; path=/; httponly, authx.d=/admin; path=/; httponly`
  );
});
