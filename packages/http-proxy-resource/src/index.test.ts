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
            '{"data": {"keys": ["-----BEGIN PUBLIC KEY-----\\nMIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQCfb+nyTPFCntEXbrFPU5DeE0gC\\n4jXRcSFWDfCRgeqeQWqIW9DeMmCj13k0z6fQCiG3FATYosS64wAs+OiyGtu9q/Jy\\nUEVIBMF0upDJMA53AFFx+0Fb/i76JFPTY7SxzvioIFeKRwY8evIRWQWYO95Os6gK\\nBac/x5qiUn5fh2xM+wIDAQAB\\n-----END PUBLIC KEY-----"]}}'
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

  await proxy.listen();
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

test("passthrough: no token", async t => {
  const result = await fetch(`http://127.0.0.1:${port}/passthrough`);
  t.assert(result.status === 200);
  t.deepEqual(await result.json(), {
    url: "/passthrough"
  });
});

test("passthrough: invalid token", async t => {
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

test("passthrough: valid token w/ empty scopes", async t => {
  const result = await fetch(`http://127.0.0.1:${port}/passthrough`, {
    headers: {
      Authorization:
        "Bearer eyJhbGciOiJSUzUxMiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIwMTU2N2EyMS01YWQyLTRkMjQtOTU3Ny1lNWVmYjI1ZmM2YjUiLCJpYXQiOjE1NTY0MDcxNzksImV4cCI6NDcxMDAwNzI0Nywic2NvcGVzIjpbXX0.m3FCkn4EKtFBWMTe1nZaL3NeHUAw_zUYIi6PKnOOa5N69XR3rYMSuNXbAxwJCQoxx66N1xD5txalsUitV_wPIaDH5Hh5MfyiF7jBUwxYDEFTDsV1Pqnyz3it8cVeaoJtROXXhSncobpSbEpKqJRZ-74ZiHNWvvyCuir0Xb_3GZE"
    }
  });
  t.assert(result.status === 200);
  t.deepEqual(await result.json(), {
    url: "/passthrough",
    "X-OAuth-Scopes": ""
  });
});

test("passthrough: valid token w/ some scopes", async t => {
  const result = await fetch(`http://127.0.0.1:${port}/passthrough`, {
    headers: {
      Authorization:
        "Bearer eyJhbGciOiJSUzUxMiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIwMTU2N2EyMS01YWQyLTRkMjQtOTU3Ny1lNWVmYjI1ZmM2YjUiLCJpYXQiOjE1NTY0MDcxNzksImV4cCI6NDcxMDAwNzI0Nywic2NvcGVzIjpbInJlYWxtOnJlc291cmNlLmlkZW50aWZpZXI6YWN0aW9uIiwicmVhbG0yOioqOioiXX0.TyN1cC0GweAU0c0bqHwMkWmlCYkdrbMVHio79TT3eQ7gbGjXHczhuzBVrfpzrXpuBqwRDQw3MYi1skaqBLz881bvH1uhGRLOhnthFmhPQyf9_qU_D8THgeKK7Sh2hOXgoawi-PZ6Bf9iB-E9z4kNMSU3cTjgYWH51erTIcebip0"
    }
  });
  t.assert(result.status === 200);
  t.deepEqual(await result.json(), {
    url: "/passthrough",
    "X-OAuth-Scopes": "realm:resource.identifier:action realm2:**:*"
  });
});

test("passthrough-with-token: invalid token", async t => {
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

test("passthrough-with-token: valid token w/ empty scopes", async t => {
  const result = await fetch(
    `http://127.0.0.1:${port}/passthrough-with-token`,
    {
      headers: {
        Authorization:
          "Bearer eyJhbGciOiJSUzUxMiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIwMTU2N2EyMS01YWQyLTRkMjQtOTU3Ny1lNWVmYjI1ZmM2YjUiLCJpYXQiOjE1NTY0MDcxNzksImV4cCI6NDcxMDAwNzI0Nywic2NvcGVzIjpbXX0.m3FCkn4EKtFBWMTe1nZaL3NeHUAw_zUYIi6PKnOOa5N69XR3rYMSuNXbAxwJCQoxx66N1xD5txalsUitV_wPIaDH5Hh5MfyiF7jBUwxYDEFTDsV1Pqnyz3it8cVeaoJtROXXhSncobpSbEpKqJRZ-74ZiHNWvvyCuir0Xb_3GZE"
      }
    }
  );
  t.assert(result.status === 200);
  t.deepEqual(await result.json(), {
    url: "/passthrough-with-token",
    "X-OAuth-Scopes": "",
    Authorization:
      "Bearer eyJhbGciOiJSUzUxMiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIwMTU2N2EyMS01YWQyLTRkMjQtOTU3Ny1lNWVmYjI1ZmM2YjUiLCJpYXQiOjE1NTY0MDcxNzksImV4cCI6NDcxMDAwNzI0Nywic2NvcGVzIjpbXX0.m3FCkn4EKtFBWMTe1nZaL3NeHUAw_zUYIi6PKnOOa5N69XR3rYMSuNXbAxwJCQoxx66N1xD5txalsUitV_wPIaDH5Hh5MfyiF7jBUwxYDEFTDsV1Pqnyz3it8cVeaoJtROXXhSncobpSbEpKqJRZ-74ZiHNWvvyCuir0Xb_3GZE"
  });
});

test("restrict-empty: invalid token", async t => {
  const result = await fetch(`http://127.0.0.1:${port}/restrict-empty`, {
    headers: {
      Authorization:
        "Bearer eyJhbGciOiJSUzUxMiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIwMTU2N2EyMS01YWQyLTRkMjQtOTU3Ny1lNWVmYjI1ZmM2YjUiLCJpYXQiOjE1NTY0MDcxNzksImV4cCI6MTU1NjQwNzQ3OSwic2NvcGVzIjpbXX0.C-cbh7Je6n-wafJWBSwadfOcq4vwABvI-CvvB82AJuInwd4zCCIww4hq5zH9GXJxSZfquGfus4QjJ8L0E2qgGJsN9ix5UzZTCZzimSX-jr_PDDm88CiYzVvyh2QgI5QcnOzFEMPNyNjlttr0wG8WSn1MAX2uW8PbFxOQKGrXjEg"
    }
  });
  t.assert(result.status === 401);
});

test("restrict-empty: valid token w/ some scopes", async t => {
  const result = await fetch(`http://127.0.0.1:${port}/restrict-empty`, {
    headers: {
      Authorization:
        "Bearer eyJhbGciOiJSUzUxMiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIwMTU2N2EyMS01YWQyLTRkMjQtOTU3Ny1lNWVmYjI1ZmM2YjUiLCJpYXQiOjE1NTY0MDcxNzksImV4cCI6NDcxMDAwNzI0Nywic2NvcGVzIjpbInJlYWxtOnJlc291cmNlLmlkZW50aWZpZXI6YWN0aW9uIiwicmVhbG0yOioqOioiXX0.TyN1cC0GweAU0c0bqHwMkWmlCYkdrbMVHio79TT3eQ7gbGjXHczhuzBVrfpzrXpuBqwRDQw3MYi1skaqBLz881bvH1uhGRLOhnthFmhPQyf9_qU_D8THgeKK7Sh2hOXgoawi-PZ6Bf9iB-E9z4kNMSU3cTjgYWH51erTIcebip0"
    }
  });
  t.assert(result.status === 200);
  t.deepEqual(await result.json(), {
    url: "/restrict-empty",
    "X-OAuth-Scopes": "realm:resource.identifier:action realm2:**:*",
    "X-OAuth-Required-Scopes": ""
  });
});

test("restrict-scopes: valid token w/ empty scopes", async t => {
  const result = await fetch(`http://127.0.0.1:${port}/restrict-scopes`, {
    headers: {
      Authorization:
        "Bearer eyJhbGciOiJSUzUxMiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIwMTU2N2EyMS01YWQyLTRkMjQtOTU3Ny1lNWVmYjI1ZmM2YjUiLCJpYXQiOjE1NTY0MDcxNzksImV4cCI6NDcxMDAwNzI0Nywic2NvcGVzIjpbXX0.m3FCkn4EKtFBWMTe1nZaL3NeHUAw_zUYIi6PKnOOa5N69XR3rYMSuNXbAxwJCQoxx66N1xD5txalsUitV_wPIaDH5Hh5MfyiF7jBUwxYDEFTDsV1Pqnyz3it8cVeaoJtROXXhSncobpSbEpKqJRZ-74ZiHNWvvyCuir0Xb_3GZE"
    }
  });
  t.assert(result.status === 403);
});

test("restrict-scopes: valid token w/ some scopes", async t => {
  const result = await fetch(`http://127.0.0.1:${port}/restrict-scopes`, {
    headers: {
      Authorization:
        "Bearer eyJhbGciOiJSUzUxMiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIwMTU2N2EyMS01YWQyLTRkMjQtOTU3Ny1lNWVmYjI1ZmM2YjUiLCJpYXQiOjE1NTY0MDcxNzksImV4cCI6NDcxMDAwNzI0Nywic2NvcGVzIjpbInJlYWxtOnJlc291cmNlLmlkZW50aWZpZXI6YWN0aW9uIiwicmVhbG0yOioqOioiXX0.TyN1cC0GweAU0c0bqHwMkWmlCYkdrbMVHio79TT3eQ7gbGjXHczhuzBVrfpzrXpuBqwRDQw3MYi1skaqBLz881bvH1uhGRLOhnthFmhPQyf9_qU_D8THgeKK7Sh2hOXgoawi-PZ6Bf9iB-E9z4kNMSU3cTjgYWH51erTIcebip0"
    }
  });
  t.assert(result.status === 200);
  t.deepEqual(await result.json(), {
    url: "/restrict-scopes",
    "X-OAuth-Scopes": "realm:resource.identifier:action realm2:**:*",
    "X-OAuth-Required-Scopes": "realm2:foo:bar"
  });
});

test("rewrite-url: no token", async t => {
  const result = await fetch(`http://127.0.0.1:${port}/rewrite-url`);
  t.assert(result.status === 200);
  t.deepEqual(await result.json(), {
    url: "/rewritten"
  });
});
