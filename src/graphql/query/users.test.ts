import test from "ava";
import { registerHooks, SUPER_ADMIN_AUTH_STRING } from "../../util";
import {
  ClientAction,
  ClientContext,
  createV2AuthXScope,
  UserAction,
  UserContext
} from "@authx/authx/dist/util/scopes";

const ctx = registerHooks(__filename);

test("Fetch users with limited read scope and page", async t => {
  function createUserReadScope(userId: string): string {
    const action: UserAction = {
      basic: "r"
    };

    return createV2AuthXScope(
      "authx",
      {
        type: "user",
        userId: userId
      },
      action
    );
  }

  const token = await ctx.createLimitedAuthorization([
    createUserReadScope("0cbd3783-0424-4f35-be51-b42f07a2a987"), // Dwight Schrute
    createUserReadScope("51192909-3664-44d5-be62-c6b45f0b0ee6"), // Darryl Philbin
    createUserReadScope("d0fc4c64-a3d6-4d97-9341-07de24439bb1"), // Jim Halpert
    createUserReadScope("eaa9fa5e-088a-4ae2-a6ab-f120006b20a9") // Pam Beesly-Halpert
  ]);

  const target = (
    await ctx.graphQL(
      `
    query {
        users {
            pageInfo {
                hasNextPage
                hasPreviousPage
            }
            edges {
                node {
                    id
                    name
                }
                cursor
            }
        }
    }
    `,
      token
    )
  ).users;

  t.assert(target.edges !== null);
  t.deepEqual(
    target.edges.map((it: any) => it.node.name).sort(),
    [
      "Dwight Schrute",
      "Darryl Philbin",
      "Jim Halpert",
      "Pam Beesly-Halpert"
    ].sort()
  );

  const firstCursor = target.edges[0].cursor;

  const target2 = (
    await ctx.graphQL(
      `
    query {
        users(first:2, after:"${firstCursor}") {
            pageInfo {
                hasNextPage
                hasPreviousPage
            }
            edges {
                node {
                    id
                    name
                }
                cursor
            }
        }
    }
    `,
      token
    )
  ).users;

  t.assert(target2.edges !== null);
  t.deepEqual(
    target2.edges.map((it: any) => it.node.name).sort(),
    ["Darryl Philbin", "Jim Halpert"].sort()
  );
  t.assert(target2.pageInfo.hasNextPage);

  const lastCursor = target2.edges[1].cursor;

  const target3 = (
    await ctx.graphQL(
      `
    query {
        users(first:2, after:"${lastCursor}") {
            pageInfo {
                hasNextPage
                hasPreviousPage
            }
            edges {
                node {
                    id
                    name
                }
                cursor
            }
        }
    }
    `,
      token
    )
  ).users;

  t.assert(target3.edges !== null);
  t.deepEqual(
    target3.edges.map((it: any) => it.node.name).sort(),
    ["Pam Beesly-Halpert"].sort()
  );
  t.assert(!target3.pageInfo.hasNextPage);
});

test("Fetch users with limited read scope and reverse page", async t => {
  function createUserReadScope(userId: string): string {
    const action: UserAction = {
      basic: "r"
    };

    return createV2AuthXScope(
      "authx",
      {
        type: "user",
        userId: userId
      },
      action
    );
  }

  const token = await ctx.createLimitedAuthorization([
    createUserReadScope("0cbd3783-0424-4f35-be51-b42f07a2a987"), // Dwight Schrute
    createUserReadScope("51192909-3664-44d5-be62-c6b45f0b0ee6"), // Darryl Philbin
    createUserReadScope("d0fc4c64-a3d6-4d97-9341-07de24439bb1"), // Jim Halpert
    createUserReadScope("eaa9fa5e-088a-4ae2-a6ab-f120006b20a9") // Pam Beesly-Halpert
  ]);

  const target = (
    await ctx.graphQL(
      `
    query {
        users(last:2) {
            pageInfo {
                hasNextPage
                hasPreviousPage
            }
            edges {
                node {
                    id
                    name
                }
                cursor
            }
        }
    }
    `,
      token
    )
  ).users;

  t.assert(target.edges !== null);
  t.deepEqual(
    target.edges.map((it: any) => it.node.name),
    ["Jim Halpert", "Pam Beesly-Halpert"]
  );
  t.assert(target.pageInfo.hasPreviousPage);

  const target2 = (
    await ctx.graphQL(
      `
    query {
        users(last:2, before:"${target.edges[0].cursor}") {
            pageInfo {
                hasNextPage
                hasPreviousPage
            }
            edges {
                node {
                    id
                    name
                }
                cursor
            }
        }
    }
    `,
      token
    )
  ).users;

  t.assert(target2.edges !== null);
  t.deepEqual(
    target2.edges.map((it: any) => it.node.name),
    ["Dwight Schrute", "Darryl Philbin"]
  );
  t.assert(!target2.pageInfo.hasPreviousPage);
});

test("Fetch users super admin scope", async t => {
  const target = (
    await ctx.graphQL(
      `
    query {
        users(first:4) {
            edges {
                node {
                    id
                    name
                }
                cursor
            }
        }
    }
    `,
      SUPER_ADMIN_AUTH_STRING
    )
  ).users;

  t.assert(target.edges !== null);
  t.deepEqual(
    target.edges.map((it: any) => it.node.name).sort(),
    [
      "Dwight Schrute",
      "Dunder Mifflin Infinity",
      "Toby Flenderson",
      "Darryl Philbin"
    ].sort()
  );
});

test("Fetch users all users scope", async t => {
  const clientContext: UserContext = {
    userId: "*",
    type: "user"
  };

  const clientAction: UserAction = {
    basic: "r"
  };

  const token = await ctx.createLimitedAuthorization([
    createV2AuthXScope("authx", clientContext, clientAction)
  ]);

  const target = (
    await ctx.graphQL(
      `
    query {
        users(first:4) {
            edges {
                node {
                    id
                    name
                }
                cursor
            }
        }
    }
    `,
      token
    )
  ).users;

  t.assert(target.edges !== null);
  t.deepEqual(
    target.edges.map((it: any) => it.node.name).sort(),
    [
      "Dwight Schrute",
      "Dunder Mifflin Infinity",
      "Toby Flenderson",
      "Darryl Philbin"
    ].sort()
  );
});

test("Fetch users incorrect scope", async t => {
  const clientContext: ClientContext = {
    clientId: "*",
    type: "client"
  };

  const clientAction: ClientAction = {
    basic: "r",
    secrets: "r"
  };

  const token = await ctx.createLimitedAuthorization([
    createV2AuthXScope("authx", clientContext, clientAction)
  ]);

  const target = (
    await ctx.graphQL(
      `
    query {
        users {
            edges {
                node {
                    id
                    name
                }
                cursor
            }
        }
    }
    `,
      token
    )
  ).users;

  t.assert(target.edges === null);
});

test("Fetch users anonymous scope", async t => {
  const target = (
    await ctx.graphQL(`
    query {
        users(first:4) {
            edges {
                node {
                    id
                    name
                }
                cursor
            }
        }
    }
    `)
  ).users;

  t.assert(target.edges === null);
});
