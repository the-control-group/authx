import { URL } from "url";
import test from "ava";
import { v4 } from "uuid";
import { setup } from "./setup.js";
import { basename } from "path";

export class FunctionalTestContext {
  url: URL | null = null;

  async graphQL(
    query: string,
    basicAuthString: string | null = null,
  ): Promise<{ errors?: null | { message: string }[]; data: unknown }> {
    if (this.url == null)
      throw new Error('"graphQL" should only be called from in a test');

    const graphqlUrl = new URL(this.url.href);
    graphqlUrl.pathname = "/graphql";

    const headers: { [key: string]: string } = {
      "content-type": "application/json",
    };

    if (basicAuthString) headers["authorization"] = `Basic ${basicAuthString}`;

    const result = await fetch(graphqlUrl.href, {
      method: "POST",
      headers: headers,
      body: JSON.stringify({
        query: query,
      }),
    });

    return result.json() as any;
  }

  async createLimitedAuthorization(
    scopes: string[],
  ): Promise<[string, string]> {
    // Make sure the UUID here begins with 4 "f" characters, so that it will
    // always sort below the other fixture IDs.
    const id = v4().replace(/^.{4}/, "ffff");

    const r1 = (await this.graphQL(
      `
      mutation {
        createAuthorizations(authorizations: {
          id: ${JSON.stringify(id)},
          enabled: true,
          userId: "a6a0946d-eeb4-45cd-83c6-c7920f2272eb",
          grantId: "e4670762-beb7-435c-94af-055b951f97e6",
          scopes: ${JSON.stringify(scopes)}
        }) {
          id
          secret
        }
      }
      `,
      SUPER_ADMIN_AUTH_STRING,
    )) as {
      data: {
        createAuthorizations: { id: string; secret: string }[];
      };
    };

    const authorization = r1.data.createAuthorizations[0];
    if (!authorization) {
      throw new Error("Missing test authorization!");
    }

    return [
      id,
      Buffer.from(
        `${authorization.id}:${authorization.secret}`,
        "ascii",
      ).toString("base64"),
    ];
  }
}

export function registerHooks(filename: string): FunctionalTestContext {
  let teardown: () => Promise<void>;

  const ctx = new FunctionalTestContext();

  // Setup.
  test.before(async () => {
    const s = await setup(basename(filename, ".js"));
    ctx.url = s.url;
    teardown = s.teardown;
  });

  // Teardown.
  test.after.always(async () => {
    if (teardown) {
      await teardown();
    }
  });

  return ctx;
}

export const SUPER_ADMIN_AUTH_STRING =
  "YzcwZGE0OTgtMjdlZC00YzNiLWEzMTgtMzhiYjIyMGNlZjQ4OjhmNTczOTVlY2Q5ZDZmY2I4ODQxNDVmOGY2ZmVmZjM1N2ZlYWQyZmJkODM2MDdlODdkNzFhN2MzNzJjZjM3YWQ=";
