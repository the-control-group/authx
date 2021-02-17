import test from "ava";
import fetch from "node-fetch";
import { URL } from "url";
import { setup } from "./setup";
import { basename } from "path";

let url: URL;
let teardown: () => Promise<void>;

// Setup.
test.before(async () => {
  const s = await setup(basename(__filename, ".js"));
  url = s.url;
  teardown = s.teardown;
});

test("Authorization of disabled user cannot be used.", async (t) => {
  const graphqlUrl = new URL(url.href);
  graphqlUrl.pathname = "/graphql";

  const result = await fetch(graphqlUrl.href, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization:
        "Basic NmQ2NDgzNDItNWI3Yi00YWFmLTg5MjQtM2FlM2JmNTQ5NjZkOjQ5OTAzMjM0YWRkN2ZmYjg2ZDU0YmUzOWU5OWU0YzEyOGE3MGQ3MTgzMTdkNzhjOTE5OGVlMDQxYWI5MTA5Yjc=",
    },
    body: JSON.stringify({
      query: /* GraphQL */ `
        query {
          viewer {
            id
            access
          }
        }
      `,
    }),
  });

  const json = await result.json();

  t.deepEqual(
    {
      errors: [
        {
          message:
            "The user of the authorization specified in HTTP authorization header is disabled.",
        },
      ],
    },
    json
  );
});

test("Authorization of disabled grant cannot be used.", async (t) => {
  const graphqlUrl = new URL(url.href);
  graphqlUrl.pathname = "/graphql";

  const result = await fetch(graphqlUrl.href, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization:
        "Basic OTg4M2M2ZGMtNzQ4MC00OWQ4LWFlNzAtZDUwYWFiNTkyMDVkOmJmNTIyNDU0OWY1YjljMzI2NGViYjI5NjgyN2U3NjkzOGJlN2M4ZmUzNDA4MGQ2N2FjYjA4ZDVhZWE4OWUwZGI=",
    },
    body: JSON.stringify({
      query: /* GraphQL */ `
        query {
          viewer {
            id
            access
          }
        }
      `,
    }),
  });

  const json = await result.json();

  t.deepEqual(
    {
      errors: [
        {
          message:
            "The grant of the authorization specified in HTTP authorization header is disabled.",
        },
      ],
    },
    json
  );
});

test("Disabled authorization cannot be used.", async (t) => {
  const graphqlUrl = new URL(url.href);
  graphqlUrl.pathname = "/graphql";

  const result = await fetch(graphqlUrl.href, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization:
        "Basic NWRlNWQzODEtNjI1Ny00OTMwLTg2M2ItNTUxNzQwMmE2N2Y3OmYzMjUxYTM1OTAzYWUyMDIwODYwMmJiMzhkNTIwOWMyNDdkMDIwZDYxNmEzZTFkMWE2MTA5ZTAwOWY0NTkwZDY=",
    },
    body: JSON.stringify({
      query: /* GraphQL */ `
        query {
          viewer {
            id
            access
          }
        }
      `,
    }),
  });

  const json = await result.json();

  t.deepEqual(
    {
      errors: [
        {
          message:
            "The authorization specified in HTTP authorization header is disabled.",
        },
      ],
    },
    json
  );
});

test("Access is revoked from disble authorizations.", async (t) => {
  const graphqlUrl = new URL(url.href);
  graphqlUrl.pathname = "/graphql";

  const result = await fetch(graphqlUrl.href, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization:
        "Basic YzcwZGE0OTgtMjdlZC00YzNiLWEzMTgtMzhiYjIyMGNlZjQ4OjhmNTczOTVlY2Q5ZDZmY2I4ODQxNDVmOGY2ZmVmZjM1N2ZlYWQyZmJkODM2MDdlODdkNzFhN2MzNzJjZjM3YWQ=",
    },
    body: JSON.stringify({
      query: /* GraphQL */ `
        query {
          authorizationOfDisabledUser: authorization(
            id: "6d648342-5b7b-4aaf-8924-3ae3bf54966d"
          ) {
            id
            access
          }

          authorizationOfDisabledGrant: authorization(
            id: "9883c6dc-7480-49d8-ae70-d50aab59205d"
          ) {
            id
            access
          }

          disabledAuthorization: authorization(
            id: "5de5d381-6257-4930-863b-5517402a67f7"
          ) {
            id
            access
          }
        }
      `,
    }),
  });

  const json = await result.json();

  t.deepEqual(
    {
      data: {
        authorizationOfDisabledGrant: {
          access: [],
          id: "9883c6dc-7480-49d8-ae70-d50aab59205d",
        },
        authorizationOfDisabledUser: {
          access: [],
          id: "6d648342-5b7b-4aaf-8924-3ae3bf54966d",
        },
        disabledAuthorization: {
          access: [],
          id: "5de5d381-6257-4930-863b-5517402a67f7",
        },
      },
    },
    json
  );
});

// Teardown.
test.after.always(async () => {
  if (teardown) {
    await teardown();
  }
});
