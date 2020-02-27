import test from "ava";
import { createServer, Server } from "http";
import AuthXClientProxy from ".";
import fetch from "node-fetch";

const nowInSeconds = Math.floor(Date.now() / 1000);

let mockAuthX: {
  server: Server;
  port: number;
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
    }>((resolve, reject) => {
      const server = createServer((request, response) => {
        const data: Buffer[] = [];
        request.on("data", function(d) {
          data.push(d);
        });
        request.on("end", function() {
          const body = JSON.parse(Buffer.concat(data).toString());
          if (body.grant_type !== "refresh_token")
            throw new Error("Request must include grant_type=refresh_token.");

          if (!body.client_id)
            throw new Error("Request must include client_id.");

          if (!body.client_secret)
            throw new Error("Request must include client_secret.");

          response.statusCode = 200;
          response.setHeader("Content-Type", "application/json");
          response.end(
            JSON.stringify({
              /* eslint-disable @typescript-eslint/camelcase */
              token_type: "bearer",
              access_token: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${Buffer.from(
                JSON.stringify({
                  aid: "810348aa-d295-4d42-a264-7c6c4861367f",
                  scopes: body.scope.split(" ").filter((s: string) => !!s),
                  exp: nowInSeconds + 3600,
                  iss: "authx",
                  sub: "c79a01a2-0ed7-45c5-93b8-bc921d5cf368",
                  aud: body.client_id
                })
              )
                .toString("base64")
                .replace(
                  /=*$/,
                  ""
                )}.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c`,
              refresh_token: body.refresh_token,
              expires_in: 3600,
              scope: body.scope
              /* eslint-enable @typescript-eslint/camelcase */
            })
          );
        });
      });

      server.once("listening", async () => {
        const address = server && server.address();
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
        response.statusCode = 200;
        response.setHeader("Content-Type", "application/json");

        let encoded =
          request.headers.authorization &&
          request.headers.authorization.split(".")[1];

        if (encoded) {
          for (let i = (encoded.length % 4) - 1; i >= 0; i--) {
            encoded += "=";
          }
        }

        const decoded = encoded
          ? Buffer.from(encoded, "base64").toString()
          : "null";
        response.end(
          JSON.stringify({
            url: request.url,
            token: JSON.parse(decoded)
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

      server.listen(undefined, "localhost");
    })
  ]);

  mockAuthX = mocks[0];
  mockTarget = mocks[1];

  proxy = new AuthXClientProxy({
    authxUrl: `http://127.0.0.1:${mockAuthX.port}`,
    clientId: "b22282bf-1b78-4ffc-a0d6-2da5465895d0",
    clientSecret: "de2c693f-b654-4cf2-b3db-eb37a36bc7a9",
    readinessEndpoint: "/_ready",
    rules: [
      {
        test({ url }) {
          return url === "/no-token";
        },
        behavior: {
          proxyOptions: { target: `http://127.0.0.1:${mockTarget.port}` }
        }
      },
      {
        test({ url }) {
          return url === "/with-static-token";
        },
        behavior: {
          proxyOptions: { target: `http://127.0.0.1:${mockTarget.port}` },
          refreshToken: "cbfd6ad6-b770-4ffd-911d-d999a894a0fb"
        }
      },
      {
        test({ url }) {
          return url === "/with-static-token-and-scopes";
        },
        behavior: {
          proxyOptions: { target: `http://127.0.0.1:${mockTarget.port}` },
          refreshToken: "cbfd6ad6-b770-4ffd-911d-d999a894a0fb",
          sendTokenToTargetWithScopes: ["foo:**:**"]
        }
      },
      {
        test({ url }) {
          return url === "/with-dynamic-token-and-scopes";
        },
        behavior(request) {
          request.url = "/rewritten";
          return {
            proxyOptions: { target: `http://127.0.0.1:${mockTarget.port}` },
            refreshToken: "58582764-308e-4eaa-9e72-dbb7e7f1c085",
            sendTokenToTargetWithScopes: ["**:**:**"]
          };
        }
      }
    ]
  });

  proxy.on("error", error => console.error(error));

  await proxy.listen({ port: 0, host: "localhost" });
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

test("no token", async t => {
  const result = await fetch(`http://127.0.0.1:${port}/no-token`);
  t.assert(result.status === 200);
  t.deepEqual(await result.json(), {
    url: "/no-token",
    token: null
  });
});

test("with static token", async t => {
  const result = await fetch(`http://127.0.0.1:${port}/with-static-token`);
  t.assert(result.status === 200);
  t.deepEqual(await result.json(), {
    url: "/with-static-token",
    token: {
      aid: "810348aa-d295-4d42-a264-7c6c4861367f",
      scopes: [],
      exp: nowInSeconds + 3600,
      iss: "authx",
      sub: "c79a01a2-0ed7-45c5-93b8-bc921d5cf368",
      aud: "b22282bf-1b78-4ffc-a0d6-2da5465895d0"
    }
  });
});

test("with static token and scopes", async t => {
  const result = await fetch(
    `http://127.0.0.1:${port}/with-static-token-and-scopes`
  );
  t.assert(result.status === 200);
  t.deepEqual(await result.json(), {
    url: "/with-static-token-and-scopes",
    token: {
      aid: "810348aa-d295-4d42-a264-7c6c4861367f",
      scopes: ["foo:**:**"],
      exp: nowInSeconds + 3600,
      iss: "authx",
      sub: "c79a01a2-0ed7-45c5-93b8-bc921d5cf368",
      aud: "b22282bf-1b78-4ffc-a0d6-2da5465895d0"
    }
  });
});

test("with dynamic token and scopes", async t => {
  const result = await fetch(
    `http://127.0.0.1:${port}/with-dynamic-token-and-scopes`
  );
  t.assert(result.status === 200);
  t.deepEqual(await result.json(), {
    url: "/rewritten",
    token: {
      aid: "810348aa-d295-4d42-a264-7c6c4861367f",
      scopes: ["**:**:**"],
      exp: nowInSeconds + 3600,
      iss: "authx",
      sub: "c79a01a2-0ed7-45c5-93b8-bc921d5cf368",
      aud: "b22282bf-1b78-4ffc-a0d6-2da5465895d0"
    }
  });
});
