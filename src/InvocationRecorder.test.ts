import test from "ava";
import fetch from "node-fetch";
import { URL } from "url";
import { setup } from "./setup";
import { basename } from "path";
import { InvocationRecorder } from "@authx/authx/dist/InvocationRecorder";
import { Authorization, AuthorizationInvocation } from "@authx/authx";

class StubInvocationRecorder implements InvocationRecorder {
  public numCalls = 0;

  async queueAuthorizationInvocation(
    tx: any,
    authorization: Authorization,
    data: {
      id: string;
      format: string;
      createdAt: Date;
    }
  ): Promise<AuthorizationInvocation> {
    this.numCalls++;
    return {
      ...data,
      entityId: "ENT",
      recordId: "REC",
    } as AuthorizationInvocation;
  }
}

let url: URL;
let teardown: () => Promise<void>;

let invocationRecorder: StubInvocationRecorder | null = null;

// Setup.
test.before(async () => {
  invocationRecorder = new StubInvocationRecorder();
  const s = await setup(basename(__filename, ".js"), {
    invocationRecorder,
  });
  url = s.url;
  teardown = s.teardown;
});

test("InvocationRecorder is called when expected", async (t) => {
  t.deepEqual(invocationRecorder?.numCalls, 0);

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
          viewer {
            id
          }
        }
      `,
    }),
  });

  t.deepEqual(invocationRecorder?.numCalls, 1);
});

// Teardown.
test.after.always(async () => {
  if (teardown) {
    await teardown();
  }
});
