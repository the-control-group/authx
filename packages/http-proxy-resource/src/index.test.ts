import test from "ava";
import { createServer, Server } from "http";
import AuthXResourceProxy from ".";
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

let proxy: AuthXResourceProxy;
let port: number;

// const PRIVATE = `-----BEGIN RSA PRIVATE KEY-----
// MIICXQIBAAKBgQCpLHK8iuVyzngAGvCHRyXroshmzxV3ZjDZBs0kz3mIwD0fIrUL
// FrToSYRf5Lex7Nr2NF3kl9FbhNL8x1de0tynkUHjK9nxP/RCoM5BxzxGOF5QLIJt
// N1cgwJBphncfUkAwOom8O7kuksfFzKk1RkM0hQWAwGI0Q2+lzy0NrXtSNQIDAQAB
// AoGAbmlxFPb+G7j/fuoWM+ROroTWkKr1UrEijnKu7yhuJL965NhNGsieF8DroX5w
// GbMBkZDJ+wjO/hEpdwtPTbcHhU7D7rNStwwTbonZjuaZM5yPylOdMnDDbrwgKGSy
// i3hy9MEECTdCH1/y5yG4NdfPwRHr7WDM5xBrqcDK/eHpXGECQQD0sIxPmpNGyz/1
// oqMcMZMEwy3eCr/26C+5dciuROkfx/doXI+Afo9I+S5kXv1KBvgq7DKd6IIwQS+6
// b/TIm2YtAkEAsP5Ok1EZQoEpOpWa66f5i7KyrSFjtQwpI/uRjznzDO9CEXCnuRu2
// IgjR4L/peQtvIBdn+VH8QhOFd0dTH53pKQJAKtjPeREEQR1OMeEs1r8Hk4np+ju/
// qai20q8BWSLP/7SwaiHrLwD6bjjUGtdXWyMlSb7ajjQst+5yQR9hqc8scQJBAKJw
// g8UIxVoYGLK/43MsswbXds0Wu9/JzWhM1obQ9JSGceh3sDdfi4Uo+xZ+i9Sf/dlC
// Ihbce9xY9kFGoK9/yiECQQC2ZEaLy6dcuozv8tz/YjzGukcsaNrGZcxZo8b5qRRF
// BZGH6mhHwbbyilc8Tt5f5zHRRe5JrWH39ORtSsdlPb/+
// -----END RSA PRIVATE KEY-----`;

const PUBLIC = `-----BEGIN PUBLIC KEY-----
MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQCpLHK8iuVyzngAGvCHRyXroshm
zxV3ZjDZBs0kz3mIwD0fIrULFrToSYRf5Lex7Nr2NF3kl9FbhNL8x1de0tynkUHj
K9nxP/RCoM5BxzxGOF5QLIJtN1cgwJBphncfUkAwOom8O7kuksfFzKk1RkM0hQWA
wGI0Q2+lzy0NrXtSNQIDAQAB
-----END PUBLIC KEY-----`;

test.before(async () => {
  const mocks = (await Promise.all([
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

          let body = "";
          request.on("data", data => {
            body += data.toString();
          });

          request.on("end", () => {
            if (body === '{"query": "query { keys }"}') {
              response.end(`{"data": {"keys": [${JSON.stringify(PUBLIC)}]}}`);
            } else if (
              request.headers.authorization ===
              "Basic ZDQ5MDIxZGUtNDllNS00MjEwLWEyYzctYzM0NzM3MDQyMTQwOkdGRk53dHZQS09QemNJZHl4"
            ) {
              response.end(
                '{"data": { "viewer": { "id": "d49021de-49e5-4210-a2c7-c34737042140", "enabled": true, "access": ["realm:resource.identifier:action", "realm2:**:*"], "user": { "id": "cc7a9f08-2c1b-43bb-888c-d0469914d013" } } }}'
              );
            } else if (
              request.headers.authorization ===
              "Basic OWY1YmU1OTktNGU2My00NzgzLTkxNWUtNTA3OTM4ZTc0ZjFhOkdGRk53dHZQS09QemNJZHl4"
            ) {
              response.end(
                '{"data": { "viewer": { "id": "d49021de-49e5-4210-a2c7-c34737042140", "enabled": true, "access": [], "user": { "id": "cc7a9f08-2c1b-43bb-888c-d0469914d013" } } }}'
              );
            } else {
              response.end(
                '{"errors": [ "Query not known by the mock AuthX server." ]}'
              );
            }
          });

          request.on("error", error => {
            console.error(error);
            response.statusCode = 500;
            response.end();
          });
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

      server.listen(undefined, "localhost");
    })
  ])) as [
    {
      server: Server;
      port: number;
      enable: () => void;
    },
    {
      server: Server;
      port: number;
    }
  ];

  mockAuthX = mocks[0];
  mockTarget = mocks[1];

  proxy = new AuthXResourceProxy({
    authxUrl: `http://127.0.0.1:${mockAuthX.port}`,
    readinessEndpoint: "/_ready",
    rules: [
      {
        test({ url }) {
          return url === "/passthrough";
        },
        behavior: {
          proxyOptions: { target: `http://127.0.0.1:${mockTarget.port}` }
        }
      },
      {
        test({ url }) {
          return url === "/passthrough-with-token";
        },
        behavior: {
          proxyOptions: { target: `http://127.0.0.1:${mockTarget.port}` },
          sendTokenToTarget: true
        }
      },
      {
        test({ url }) {
          return url === "/restrict-empty";
        },
        behavior: {
          proxyOptions: { target: `http://127.0.0.1:${mockTarget.port}` },
          requireScopes: []
        }
      },
      {
        test({ url }) {
          return url === "/restrict-scopes";
        },
        behavior: {
          proxyOptions: { target: `http://127.0.0.1:${mockTarget.port}` },
          requireScopes: ["realm2:foo:bar"]
        }
      },
      {
        test({ url }) {
          return url === "/rewrite-url";
        },
        behavior(request) {
          request.url = "/rewritten";
          return {
            proxyOptions: { target: `http://127.0.0.1:${mockTarget.port}` }
          };
        }
      }
    ]
  });

  proxy.on("error", error => {
    console.log(error);
  });

  await proxy.listen({ host: "localhost" });
  const address = proxy && proxy.server.address();
  if (!address || typeof address === "string" || !address.port) {
    throw new Error("No address for mock server.");
  }

  port = address.port;
});

test.serial("readiness depends on keys", async t => {
  const result1 = await fetch(`http://127.0.0.1:${port}/_ready`);
  t.assert(result1.status === 503);
  t.assert(
    (await result1.text()) === "NOT READY",
    "Must return NOT READY before keys are loaded."
  );

  const ready = new Promise(resolve => proxy.once("ready", resolve));
  mockAuthX.enable();
  await ready;

  const result2 = await fetch(`http://127.0.0.1:${port}/_ready`);
  t.assert(result2.status === 200);
  t.assert(
    (await result2.text()) === "READY",
    "Must return READY once the keys are loaded."
  );
});

test("passthrough: no authorization header", async t => {
  const result = await fetch(`http://127.0.0.1:${port}/passthrough`);
  t.assert(result.status === 200);
  t.deepEqual(await result.json(), {
    url: "/passthrough"
  });
});

test("passthrough: invalid bearer token", async t => {
  const result = await fetch(`http://127.0.0.1:${port}/passthrough`, {
    headers: {
      Authorization:
        "Bearer eyJhbGciOiJSUzUxMiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIwMTU2N2EyMS01YWQyLTRkMjQtOTU3Ny1lNWVmYjI1ZmM2YjUiLCJpYXQiOjE1NTY0MDcxNzksImV4cCI6MTU1NjQwNzQ3OSwic2NvcGVzIjpbXX0.C-cbh7Je6n-wafJWBSwadfOcq4vwABvI-CvvB82AJuInwd4zCCIww4hq5zH9GXJxSZfquGfus4QjJ8L0E2qgGJsN9ix5UzZTCZzimSX-jr_PDDm88CiYzVvyh2QgI5QcnOzFEMPNyNjlttr0wG8WSn1MAX2uW8PbFxOQKGrXjEg"
    }
  });
  t.assert(result.status === 200);
  t.deepEqual(await result.json(), {
    url: "/passthrough"
  });
});

test("passthrough: valid bearer token w/ empty scopes", async t => {
  const result = await fetch(`http://127.0.0.1:${port}/passthrough`, {
    headers: {
      Authorization:
        "Bearer eyJhbGciOiJSUzUxMiIsInR5cCI6IkpXVCJ9.eyJhaWQiOiJlODYyMjM4OS05MWE3LTRmODYtOTk1Ny0xNmFmYThjY2Y1NzMiLCJzdWIiOiIwMTU2N2EyMS01YWQyLTRkMjQtOTU3Ny1lNWVmYjI1ZmM2YjUiLCJpYXQiOjE1NTY0MDcxNzksImV4cCI6NDcxMDAwNzI0Nywic2NvcGVzIjpbXX0.Ac_2gr5xHw2rnDp68k2B-xeAwJjO3If-I6jFQIdAlz6cx9e--aUQlK2e9LPC2votS4e496E38p7X9VoBhxtQ5QXpSIq2-dZws4BJ2oekcU_5qzrNSqiTBh4vgPvwHcTCuWV0p_boeTNSFLWbW1AwdIt4OZbayYyoi8wvtbTOifc"
    }
  });
  t.assert(result.status === 200);
  t.deepEqual(await result.json(), {
    url: "/passthrough",
    "X-OAuth-Scopes": ""
  });
});

test("passthrough: invalid basic credentials", async t => {
  const result = await fetch(`http://127.0.0.1:${port}/passthrough`, {
    headers: {
      Authorization:
        "Basic NzhkYTM4ZDAtNDZhMC00NWM2LTgyODktYTU2ZWE3NzNjZGYxOnlmVFRuQ2hNbXpZcFZBZnU="
    }
  });
  t.assert(result.status === 200);
  t.deepEqual(await result.json(), {
    url: "/passthrough"
  });
});

test("passthrough: valid bearer token w/ some scopes", async t => {
  const result = await fetch(`http://127.0.0.1:${port}/passthrough`, {
    headers: {
      Authorization:
        "Bearer eyJhbGciOiJSUzUxMiIsInR5cCI6IkpXVCJ9.eyJhaWQiOiI5N2FiZGVmNy0wMGMyLTQ4MjItOGQ4NS03NWRlMDM4MGI2YTAiLCJzdWIiOiIwMTU2N2EyMS01YWQyLTRkMjQtOTU3Ny1lNWVmYjI1ZmM2YjUiLCJpYXQiOjE1NTY0MDcxNzksImV4cCI6NDcxMDAwNzI0Nywic2NvcGVzIjpbInJlYWxtOnJlc291cmNlLmlkZW50aWZpZXI6YWN0aW9uIiwicmVhbG0yOioqOioiXX0.jaRosfZj_AZMGPjrO9Iu8Gmljzuq33U8FHjkF6Xm0u7p4FD6u2d1950v6EHy9RJmRdJgLSuecOLlveaSvhdQNmrjd9rXGKMlxxaXgwEOtNnhZ5QN8G5n7EATeglkJ63zzLbh_pIil_tZ-Ua2T7C_PiUfH-J71R5V-OMHxbrNmRk"
    }
  });
  t.assert(result.status === 200);
  t.deepEqual(await result.json(), {
    url: "/passthrough",
    "X-OAuth-Scopes": "realm:resource.identifier:action realm2:**:*"
  });
});

test("passthrough: valid basic credentials w/ some scopes", async t => {
  const result = await fetch(`http://127.0.0.1:${port}/passthrough`, {
    headers: {
      Authorization:
        "Basic ZDQ5MDIxZGUtNDllNS00MjEwLWEyYzctYzM0NzM3MDQyMTQwOkdGRk53dHZQS09QemNJZHl4"
    }
  });
  t.assert(result.status === 200);
  t.deepEqual(await result.json(), {
    url: "/passthrough",
    "X-OAuth-Scopes": "realm:resource.identifier:action realm2:**:*"
  });
});

test("passthrough-with-token: invalid bearer token", async t => {
  const result = await fetch(
    `http://127.0.0.1:${port}/passthrough-with-token`,
    {
      headers: {
        Authorization:
          "Bearer eyJhbGciOiJSUzUxMiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIwMTU2N2EyMS01YWQyLTRkMjQtOTU3Ny1lNWVmYjI1ZmM2YjUiLCJpYXQiOjE1NTY0MDcxNzksImV4cCI6MTU1NjQwNzQ3OSwic2NvcGVzIjpbXX0.C-cbh7Je6n-wafJWBSwadfOcq4vwABvI-CvvB82AJuInwd4zCCIww4hq5zH9GXJxSZfquGfus4QjJ8L0E2qgGJsN9ix5UzZTCZzimSX-jr_PDDm88CiYzVvyh2QgI5QcnOzFEMPNyNjlttr0wG8WSn1MAX2uW8PbFxOQKGrXjEg"
      }
    }
  );
  t.assert(result.status === 200);
  t.deepEqual(await result.json(), {
    url: "/passthrough-with-token"
  });
});

test("passthrough-with-token: invalid basic credentials", async t => {
  const result = await fetch(
    `http://127.0.0.1:${port}/passthrough-with-token`,
    {
      headers: {
        Authorization:
          "Basic NzhkYTM4ZDAtNDZhMC00NWM2LTgyODktYTU2ZWE3NzNjZGYxOnlmVFRuQ2hNbXpZcFZBZnU="
      }
    }
  );
  t.assert(result.status === 200);
  t.deepEqual(await result.json(), {
    url: "/passthrough-with-token"
  });
});

test("passthrough-with-token: valid bearer token w/ empty scopes", async t => {
  const result = await fetch(
    `http://127.0.0.1:${port}/passthrough-with-token`,
    {
      headers: {
        Authorization:
          "Bearer eyJhbGciOiJSUzUxMiIsInR5cCI6IkpXVCJ9.eyJhaWQiOiJlODYyMjM4OS05MWE3LTRmODYtOTk1Ny0xNmFmYThjY2Y1NzMiLCJzdWIiOiIwMTU2N2EyMS01YWQyLTRkMjQtOTU3Ny1lNWVmYjI1ZmM2YjUiLCJpYXQiOjE1NTY0MDcxNzksImV4cCI6NDcxMDAwNzI0Nywic2NvcGVzIjpbXX0.Ac_2gr5xHw2rnDp68k2B-xeAwJjO3If-I6jFQIdAlz6cx9e--aUQlK2e9LPC2votS4e496E38p7X9VoBhxtQ5QXpSIq2-dZws4BJ2oekcU_5qzrNSqiTBh4vgPvwHcTCuWV0p_boeTNSFLWbW1AwdIt4OZbayYyoi8wvtbTOifc"
      }
    }
  );
  t.assert(result.status === 200);
  t.deepEqual(await result.json(), {
    url: "/passthrough-with-token",
    "X-OAuth-Scopes": "",
    Authorization:
      "Bearer eyJhbGciOiJSUzUxMiIsInR5cCI6IkpXVCJ9.eyJhaWQiOiJlODYyMjM4OS05MWE3LTRmODYtOTk1Ny0xNmFmYThjY2Y1NzMiLCJzdWIiOiIwMTU2N2EyMS01YWQyLTRkMjQtOTU3Ny1lNWVmYjI1ZmM2YjUiLCJpYXQiOjE1NTY0MDcxNzksImV4cCI6NDcxMDAwNzI0Nywic2NvcGVzIjpbXX0.Ac_2gr5xHw2rnDp68k2B-xeAwJjO3If-I6jFQIdAlz6cx9e--aUQlK2e9LPC2votS4e496E38p7X9VoBhxtQ5QXpSIq2-dZws4BJ2oekcU_5qzrNSqiTBh4vgPvwHcTCuWV0p_boeTNSFLWbW1AwdIt4OZbayYyoi8wvtbTOifc"
  });
});

test("passthrough-with-token: valid basic credentials w/ empty scopes", async t => {
  const result = await fetch(
    `http://127.0.0.1:${port}/passthrough-with-token`,
    {
      headers: {
        Authorization:
          "Basic OWY1YmU1OTktNGU2My00NzgzLTkxNWUtNTA3OTM4ZTc0ZjFhOkdGRk53dHZQS09QemNJZHl4"
      }
    }
  );
  t.assert(result.status === 200);
  t.deepEqual(await result.json(), {
    url: "/passthrough-with-token",
    "X-OAuth-Scopes": "",
    Authorization:
      "Basic OWY1YmU1OTktNGU2My00NzgzLTkxNWUtNTA3OTM4ZTc0ZjFhOkdGRk53dHZQS09QemNJZHl4"
  });
});

test("restrict-empty: invalid bearer token", async t => {
  const result = await fetch(`http://127.0.0.1:${port}/restrict-empty`, {
    headers: {
      Authorization:
        "Bearer eyJhbGciOiJSUzUxMiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIwMTU2N2EyMS01YWQyLTRkMjQtOTU3Ny1lNWVmYjI1ZmM2YjUiLCJpYXQiOjE1NTY0MDcxNzksImV4cCI6MTU1NjQwNzQ3OSwic2NvcGVzIjpbXX0.C-cbh7Je6n-wafJWBSwadfOcq4vwABvI-CvvB82AJuInwd4zCCIww4hq5zH9GXJxSZfquGfus4QjJ8L0E2qgGJsN9ix5UzZTCZzimSX-jr_PDDm88CiYzVvyh2QgI5QcnOzFEMPNyNjlttr0wG8WSn1MAX2uW8PbFxOQKGrXjEg"
    }
  });
  t.assert(result.status === 401);
});

test("restrict-empty: invalid basic credentials", async t => {
  const result = await fetch(`http://127.0.0.1:${port}/restrict-empty`, {
    headers: {
      Authorization:
        "Basic NzhkYTM4ZDAtNDZhMC00NWM2LTgyODktYTU2ZWE3NzNjZGYxOnlmVFRuQ2hNbXpZcFZBZnU="
    }
  });
  t.assert(result.status === 401);
});

test("restrict-empty: valid bearer token w/ some scopes", async t => {
  const result = await fetch(`http://127.0.0.1:${port}/restrict-empty`, {
    headers: {
      Authorization:
        "Bearer eyJhbGciOiJSUzUxMiIsInR5cCI6IkpXVCJ9.eyJhaWQiOiI5N2FiZGVmNy0wMGMyLTQ4MjItOGQ4NS03NWRlMDM4MGI2YTAiLCJzdWIiOiIwMTU2N2EyMS01YWQyLTRkMjQtOTU3Ny1lNWVmYjI1ZmM2YjUiLCJpYXQiOjE1NTY0MDcxNzksImV4cCI6NDcxMDAwNzI0Nywic2NvcGVzIjpbInJlYWxtOnJlc291cmNlLmlkZW50aWZpZXI6YWN0aW9uIiwicmVhbG0yOioqOioiXX0.jaRosfZj_AZMGPjrO9Iu8Gmljzuq33U8FHjkF6Xm0u7p4FD6u2d1950v6EHy9RJmRdJgLSuecOLlveaSvhdQNmrjd9rXGKMlxxaXgwEOtNnhZ5QN8G5n7EATeglkJ63zzLbh_pIil_tZ-Ua2T7C_PiUfH-J71R5V-OMHxbrNmRk"
    }
  });
  t.assert(result.status === 200);
  t.deepEqual(await result.json(), {
    url: "/restrict-empty",
    "X-OAuth-Scopes": "realm:resource.identifier:action realm2:**:*",
    "X-OAuth-Required-Scopes": ""
  });
});

test("restrict-empty: valid basic credentials w/ some scopes", async t => {
  const result = await fetch(`http://127.0.0.1:${port}/restrict-empty`, {
    headers: {
      Authorization:
        "Basic ZDQ5MDIxZGUtNDllNS00MjEwLWEyYzctYzM0NzM3MDQyMTQwOkdGRk53dHZQS09QemNJZHl4"
    }
  });
  t.assert(result.status === 200);
  t.deepEqual(await result.json(), {
    url: "/restrict-empty",
    "X-OAuth-Scopes": "realm:resource.identifier:action realm2:**:*",
    "X-OAuth-Required-Scopes": ""
  });
});

test("restrict-scopes: valid bearer token w/ empty scopes", async t => {
  const result = await fetch(`http://127.0.0.1:${port}/restrict-scopes`, {
    headers: {
      Authorization:
        "Bearer eyJhbGciOiJSUzUxMiIsInR5cCI6IkpXVCJ9.eyJhaWQiOiJlODYyMjM4OS05MWE3LTRmODYtOTk1Ny0xNmFmYThjY2Y1NzMiLCJzdWIiOiIwMTU2N2EyMS01YWQyLTRkMjQtOTU3Ny1lNWVmYjI1ZmM2YjUiLCJpYXQiOjE1NTY0MDcxNzksImV4cCI6NDcxMDAwNzI0Nywic2NvcGVzIjpbXX0.Ac_2gr5xHw2rnDp68k2B-xeAwJjO3If-I6jFQIdAlz6cx9e--aUQlK2e9LPC2votS4e496E38p7X9VoBhxtQ5QXpSIq2-dZws4BJ2oekcU_5qzrNSqiTBh4vgPvwHcTCuWV0p_boeTNSFLWbW1AwdIt4OZbayYyoi8wvtbTOifc"
    }
  });
  t.assert(result.status === 403);
});

test("restrict-scopes: valid basic credentials w/ empty scopes", async t => {
  const result = await fetch(`http://127.0.0.1:${port}/restrict-scopes`, {
    headers: {
      Authorization:
        "Basic OWY1YmU1OTktNGU2My00NzgzLTkxNWUtNTA3OTM4ZTc0ZjFhOkdGRk53dHZQS09QemNJZHl4"
    }
  });
  t.assert(result.status === 403);
});

test("restrict-scopes: valid bearer token w/ some scopes", async t => {
  const result = await fetch(`http://127.0.0.1:${port}/restrict-scopes`, {
    headers: {
      Authorization:
        "Bearer eyJhbGciOiJSUzUxMiIsInR5cCI6IkpXVCJ9.eyJhaWQiOiI5N2FiZGVmNy0wMGMyLTQ4MjItOGQ4NS03NWRlMDM4MGI2YTAiLCJzdWIiOiIwMTU2N2EyMS01YWQyLTRkMjQtOTU3Ny1lNWVmYjI1ZmM2YjUiLCJpYXQiOjE1NTY0MDcxNzksImV4cCI6NDcxMDAwNzI0Nywic2NvcGVzIjpbInJlYWxtOnJlc291cmNlLmlkZW50aWZpZXI6YWN0aW9uIiwicmVhbG0yOioqOioiXX0.jaRosfZj_AZMGPjrO9Iu8Gmljzuq33U8FHjkF6Xm0u7p4FD6u2d1950v6EHy9RJmRdJgLSuecOLlveaSvhdQNmrjd9rXGKMlxxaXgwEOtNnhZ5QN8G5n7EATeglkJ63zzLbh_pIil_tZ-Ua2T7C_PiUfH-J71R5V-OMHxbrNmRk"
    }
  });
  t.assert(result.status === 200);
  t.deepEqual(await result.json(), {
    url: "/restrict-scopes",
    "X-OAuth-Scopes": "realm:resource.identifier:action realm2:**:*",
    "X-OAuth-Required-Scopes": "realm2:foo:bar"
  });
});

test("restrict-scopes: valid basic credentials w/ some scopes", async t => {
  const result = await fetch(`http://127.0.0.1:${port}/restrict-scopes`, {
    headers: {
      Authorization:
        "Basic ZDQ5MDIxZGUtNDllNS00MjEwLWEyYzctYzM0NzM3MDQyMTQwOkdGRk53dHZQS09QemNJZHl4"
    }
  });
  t.assert(result.status === 200);
  t.deepEqual(await result.json(), {
    url: "/restrict-scopes",
    "X-OAuth-Scopes": "realm:resource.identifier:action realm2:**:*",
    "X-OAuth-Required-Scopes": "realm2:foo:bar"
  });
});

test("rewrite-url: no authorization header", async t => {
  const result = await fetch(`http://127.0.0.1:${port}/rewrite-url`);
  t.assert(result.status === 200);
  t.deepEqual(await result.json(), {
    url: "/rewritten"
  });
});
