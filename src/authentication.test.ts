import test from "ava";
import { URL, fileURLToPath } from "url";
import { setup } from "./setup.js";
import { basename } from "path";

let url: URL;
let teardown: () => Promise<void>;

// Setup.
test.before(async () => {
  const s = await setup(basename(fileURLToPath(import.meta.url), ".js"));
  url = s.url;
  teardown = s.teardown;
});

test("Failed authentication.", async (t) => {
  const graphqlUrl = new URL(url.href);
  graphqlUrl.pathname = "/graphql";

  const result = await fetch(graphqlUrl.href, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      query: `
        mutation($identityAuthorityId: ID!, $identityAuthorityUserId: String!, $passwordAuthorityId: ID!, $password: String!) {
          authenticatePassword(
            identityAuthorityId: $identityAuthorityId,
            identityAuthorityUserId: $identityAuthorityUserId,
            passwordAuthorityId: $passwordAuthorityId,
            password: $password,
          ) {
            id
            secret

            user {
              id

              authorizations {
                edges {
                  node {
                    id
                  }
                }
              }
            }
          }
        }
      `,
      variables: {
        identityAuthorityId: "0d765613-e813-40e5-9aa7-89f96531364e",
        identityAuthorityUserId: "michael.scott@dundermifflin.com",
        passwordAuthorityId: "725f9c3b-4a72-4021-9066-c89e534df5be",
        password: "wrong-password",
      },
    }),
  });

  const json = await result.json();

  t.deepEqual(json, {
    data: {
      authenticatePassword: null,
    },
    errors: [
      {
        locations: [
          {
            column: 11,
            line: 3,
          },
        ],
        message: "The password is incorrect.",
        path: ["authenticatePassword"],
      },
    ],
  });
});

test("Successful authentication.", async (t) => {
  const graphqlUrl = new URL(url.href);
  graphqlUrl.pathname = "/graphql";

  const result = await fetch(graphqlUrl.href, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      query: `
        mutation($identityAuthorityId: ID!, $identityAuthorityUserId: String!, $passwordAuthorityId: ID!, $password: String!) {
          authenticatePassword(
            identityAuthorityId: $identityAuthorityId,
            identityAuthorityUserId: $identityAuthorityUserId,
            passwordAuthorityId: $passwordAuthorityId,
            password: $password,
          ) {
            id
            secret

            user {
              id

              authorizations {
                edges {
                  node {
                    id
                  }
                }
              }
            }
          }
        }
      `,
      variables: {
        identityAuthorityId: "0d765613-e813-40e5-9aa7-89f96531364e",
        identityAuthorityUserId: "michael.scott@dundermifflin.com",
        passwordAuthorityId: "725f9c3b-4a72-4021-9066-c89e534df5be",
        password: "123456",
      },
    }),
  });

  const json = (await result.json()) as any;

  // Confirm the general shape of the response...
  t.is(typeof json, "object", "expected the response to be an object");
  t.not(json, null, "expected the response to not be null");
  t.is(
    typeof json.data,
    "object",
    "expected the response data to be an object",
  );
  t.not(json.data, null, "expected the response data to not be null");
  t.is(
    typeof json.data.authenticatePassword,
    "object",
    "expected authenticatePassword to be an object",
  );
  t.not(
    json.data.authenticatePassword,
    null,
    "expected authenticatePassword to not be null",
  );
  t.is(
    typeof json.data.authenticatePassword.user,
    "object",
    "expected authenticatePassword.user to be an object",
  );
  t.not(
    json.data.authenticatePassword.user,
    null,
    "expected authenticatePassword.user to not be null",
  );
  t.is(
    typeof json.data.authenticatePassword.user.authorizations,
    "object",
    "expected authenticatePassword.user.authorizations to be an object",
  );
  t.not(
    json.data.authenticatePassword.user.authorizations,
    null,
    "expected authenticatePassword.user.authorizations to not be null",
  );
  t.is(
    Array.isArray(json.data.authenticatePassword.user.authorizations.edges),
    true,
    "expected authenticatePassword.user.authorizations.edges to be an array",
  );

  // Make sure a new authentication is present...
  t.is(
    typeof json.data.authenticatePassword.id,
    "string",
    "expected authenticatePassword.id to be a string",
  );
  t.is(
    typeof json.data.authenticatePassword.secret,
    "string",
    "expected authenticatePassword.secret to be a string",
  );

  // Make sure we are authenticated as the correct user...
  t.is(
    json.data.authenticatePassword.user.id,
    "a6a0946d-eeb4-45cd-83c6-c7920f2272eb",
    "expected to be authenticated as a different user",
  );

  // Make sure the new ID is available in the list of user IDs...
  t.is(
    json.data.authenticatePassword.user.authorizations.edges.some(
      (e: any) => e.node?.id === json.data.authenticatePassword.id,
    ),
    true,
  );
});

// Teardown.
test.after.always(async () => {
  if (teardown) {
    await teardown();
  }
});
