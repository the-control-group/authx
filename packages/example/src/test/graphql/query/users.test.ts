import test from "ava";
import { registerHooks, SUPER_ADMIN_AUTH_STRING } from "../../util.js";
import { fileURLToPath } from "url";
import {
  ClientAction,
  ClientContext,
  createV2AuthXScope,
  UserAction,
  UserContext,
} from "@authx/authx/dist/util/scopes.js";

const ctx = registerHooks(fileURLToPath(import.meta.url));

function createUserReadScope(userId: string): string {
  const action: UserAction = {
    basic: "r",
    scopes: "",
  };

  return createV2AuthXScope(
    "authx",
    {
      type: "user",
      userId: userId,
    },
    action,
  );
}

test("Fetch users with limited read scope and page", async (t) => {
  const [, token] = await ctx.createLimitedAuthorization([
    createUserReadScope("0cbd3783-0424-4f35-be51-b42f07a2a987"), // Dwight Schrute
    createUserReadScope("51192909-3664-44d5-be62-c6b45f0b0ee6"), // Darryl Philbin
    createUserReadScope("d0fc4c64-a3d6-4d97-9341-07de24439bb1"), // Jim Halpert
    createUserReadScope("eaa9fa5e-088a-4ae2-a6ab-f120006b20a9"), // Pam Beesly-Halpert
  ]);

  const target = (await ctx.graphQL(
    `
      query {
        users(first: 5) {
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
    token,
  )) as {
    errors?: null | { message: string }[];
    data: null | {
      users: null | {
        pageInfo: null | {
          hasNextPage: null | boolean;
          hasPreviousPage: null | boolean;
        };
        edges:
          | null
          | {
              cursor: string;
              node: {
                id: string;
                name: string;
              };
            }[];
      };
    };
  };

  t.deepEqual(target, {
    data: {
      users: {
        pageInfo: { hasNextPage: false, hasPreviousPage: false },
        edges: [
          {
            node: {
              id: "0cbd3783-0424-4f35-be51-b42f07a2a987",
              name: "Dwight Schrute",
            },
            cursor: "aWQ6MGNiZDM3ODMtMDQyNC00ZjM1LWJlNTEtYjQyZjA3YTJhOTg3",
          },
          {
            node: {
              id: "51192909-3664-44d5-be62-c6b45f0b0ee6",
              name: "Darryl Philbin",
            },
            cursor: "aWQ6NTExOTI5MDktMzY2NC00NGQ1LWJlNjItYzZiNDVmMGIwZWU2",
          },
          {
            cursor: "aWQ6YTZhMDk0NmQtZWViNC00NWNkLTgzYzYtYzc5MjBmMjI3MmVi",
            node: {
              id: "a6a0946d-eeb4-45cd-83c6-c7920f2272eb",
              name: "Michael Scott",
            },
          },
          {
            node: {
              id: "d0fc4c64-a3d6-4d97-9341-07de24439bb1",
              name: "Jim Halpert",
            },
            cursor: "aWQ6ZDBmYzRjNjQtYTNkNi00ZDk3LTkzNDEtMDdkZTI0NDM5YmIx",
          },
          {
            node: {
              id: "eaa9fa5e-088a-4ae2-a6ab-f120006b20a9",
              name: "Pam Beesly-Halpert",
            },
            cursor: "aWQ6ZWFhOWZhNWUtMDg4YS00YWUyLWE2YWItZjEyMDAwNmIyMGE5",
          },
        ],
      },
    },
  });

  const firstCursor = target.data?.users?.edges?.[0]?.cursor;

  const target2 = (await ctx.graphQL(
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
    token,
  )) as {
    errors?: null | { message: string }[];
    data: null | {
      users: null | {
        pageInfo: null | {
          hasNextPage: null | boolean;
          hasPreviousPage: null | boolean;
        };
        edges:
          | null
          | {
              cursor: string;
              node: {
                id: string;
                name: string;
              };
            }[];
      };
    };
  };

  t.deepEqual(target2, {
    data: {
      users: {
        pageInfo: { hasNextPage: true, hasPreviousPage: false },
        edges: [
          {
            node: {
              id: "51192909-3664-44d5-be62-c6b45f0b0ee6",
              name: "Darryl Philbin",
            },
            cursor: "aWQ6NTExOTI5MDktMzY2NC00NGQ1LWJlNjItYzZiNDVmMGIwZWU2",
          },
          {
            cursor: "aWQ6YTZhMDk0NmQtZWViNC00NWNkLTgzYzYtYzc5MjBmMjI3MmVi",
            node: {
              id: "a6a0946d-eeb4-45cd-83c6-c7920f2272eb",
              name: "Michael Scott",
            },
          },
        ],
      },
    },
  });

  const lastCursor = target2.data?.users?.edges?.[1]?.cursor;

  const target3 = (await ctx.graphQL(
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
    token,
  )) as {
    errors?: null | { message: string }[];
    data: null | {
      users: null | {
        pageInfo: null | {
          hasNextPage: null | boolean;
          hasPreviousPage: null | boolean;
        };
        edges:
          | null
          | {
              cursor: string;
              node: {
                id: string;
                name: string;
              };
            }[];
      };
    };
  };

  t.deepEqual(target3, {
    data: {
      users: {
        pageInfo: { hasNextPage: false, hasPreviousPage: false },
        edges: [
          {
            node: {
              id: "d0fc4c64-a3d6-4d97-9341-07de24439bb1",
              name: "Jim Halpert",
            },
            cursor: "aWQ6ZDBmYzRjNjQtYTNkNi00ZDk3LTkzNDEtMDdkZTI0NDM5YmIx",
          },
          {
            node: {
              id: "eaa9fa5e-088a-4ae2-a6ab-f120006b20a9",
              name: "Pam Beesly-Halpert",
            },
            cursor: "aWQ6ZWFhOWZhNWUtMDg4YS00YWUyLWE2YWItZjEyMDAwNmIyMGE5",
          },
        ],
      },
    },
  });
});

test("Fetch users with limited read scope and reverse page", async (t) => {
  const [, token] = await ctx.createLimitedAuthorization([
    createUserReadScope("0cbd3783-0424-4f35-be51-b42f07a2a987"), // Dwight Schrute
    createUserReadScope("51192909-3664-44d5-be62-c6b45f0b0ee6"), // Darryl Philbin
    createUserReadScope("d0fc4c64-a3d6-4d97-9341-07de24439bb1"), // Jim Halpert
    createUserReadScope("eaa9fa5e-088a-4ae2-a6ab-f120006b20a9"), // Pam Beesly-Halpert
  ]);

  const target = (await ctx.graphQL(
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
    token,
  )) as {
    errors?: null | { message: string }[];
    data: null | {
      users: null | {
        pageInfo: null | {
          hasNextPage: null | boolean;
          hasPreviousPage: null | boolean;
        };
        edges:
          | null
          | {
              cursor: string;
              node: {
                id: string;
                name: string;
              };
            }[];
      };
    };
  };

  t.deepEqual(target, {
    data: {
      users: {
        pageInfo: { hasNextPage: false, hasPreviousPage: true },
        edges: [
          {
            node: {
              id: "d0fc4c64-a3d6-4d97-9341-07de24439bb1",
              name: "Jim Halpert",
            },
            cursor: "aWQ6ZDBmYzRjNjQtYTNkNi00ZDk3LTkzNDEtMDdkZTI0NDM5YmIx",
          },
          {
            node: {
              id: "eaa9fa5e-088a-4ae2-a6ab-f120006b20a9",
              name: "Pam Beesly-Halpert",
            },
            cursor: "aWQ6ZWFhOWZhNWUtMDg4YS00YWUyLWE2YWItZjEyMDAwNmIyMGE5",
          },
        ],
      },
    },
  });

  const target2 = (await ctx.graphQL(
    `
  query {
    users(last: 3, before:"${target.data?.users?.edges?.[0]?.cursor ?? ""}") {
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
    token,
  )) as {
    errors?: null | { message: string }[];
    data: null | {
      users: null | {
        pageInfo: null | {
          hasNextPage: null | boolean;
          hasPreviousPage: null | boolean;
        };
        edges:
          | null
          | {
              cursor: string;
              node: {
                id: string;
                name: string;
              };
            }[];
      };
    };
  };

  t.deepEqual(target2, {
    data: {
      users: {
        pageInfo: { hasNextPage: false, hasPreviousPage: false },
        edges: [
          {
            node: {
              id: "0cbd3783-0424-4f35-be51-b42f07a2a987",
              name: "Dwight Schrute",
            },
            cursor: "aWQ6MGNiZDM3ODMtMDQyNC00ZjM1LWJlNTEtYjQyZjA3YTJhOTg3",
          },
          {
            node: {
              id: "51192909-3664-44d5-be62-c6b45f0b0ee6",
              name: "Darryl Philbin",
            },
            cursor: "aWQ6NTExOTI5MDktMzY2NC00NGQ1LWJlNjItYzZiNDVmMGIwZWU2",
          },

          // This is an intrinsic ability of the authorization belonging to
          // Michael Scott.
          {
            cursor: "aWQ6YTZhMDk0NmQtZWViNC00NWNkLTgzYzYtYzc5MjBmMjI3MmVi",
            node: {
              id: "a6a0946d-eeb4-45cd-83c6-c7920f2272eb",
              name: "Michael Scott",
            },
          },
        ],
      },
    },
  });
});

test("Fetch users super admin scope", async (t) => {
  const target = (await ctx.graphQL(
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
    SUPER_ADMIN_AUTH_STRING,
  )) as {
    errors?: null | { message: string }[];
    data: null | {
      users: null | {
        edges:
          | null
          | {
              cursor: string;
              node: {
                id: string;
                name: string;
              };
            }[];
      };
    };
  };

  t.deepEqual(target, {
    data: {
      users: {
        edges: [
          {
            node: {
              id: "0cbd3783-0424-4f35-be51-b42f07a2a987",
              name: "Dwight Schrute",
            },
            cursor: "aWQ6MGNiZDM3ODMtMDQyNC00ZjM1LWJlNTEtYjQyZjA3YTJhOTg3",
          },
          {
            node: {
              id: "1691f38d-92c8-4d86-9a89-da99528cfcb5",
              name: "Dunder Mifflin Infinity",
            },
            cursor: "aWQ6MTY5MWYzOGQtOTJjOC00ZDg2LTlhODktZGE5OTUyOGNmY2I1",
          },
          {
            node: {
              id: "306eabbb-cc2b-4f88-be19-4bb6ec98e5c3",
              name: "Toby Flenderson",
            },
            cursor: "aWQ6MzA2ZWFiYmItY2MyYi00Zjg4LWJlMTktNGJiNmVjOThlNWMz",
          },
          {
            node: {
              id: "51192909-3664-44d5-be62-c6b45f0b0ee6",
              name: "Darryl Philbin",
            },
            cursor: "aWQ6NTExOTI5MDktMzY2NC00NGQ1LWJlNjItYzZiNDVmMGIwZWU2",
          },
        ],
      },
    },
  });
});

test("Fetch users all users scope", async (t) => {
  const clientContext: UserContext = {
    userId: "*",
    type: "user",
  };

  const clientAction: UserAction = {
    basic: "r",
    scopes: "",
  };

  const [, token] = await ctx.createLimitedAuthorization([
    createV2AuthXScope("authx", clientContext, clientAction),
  ]);

  const target = (await ctx.graphQL(
    `
      query {
        users(first:4) {
          edges {
            node {
              id
              name
              access
            }
            cursor
          }
        }
      }
      `,
    token,
  )) as {
    errors?: null | { message: string }[];
    data: null | {
      users: null | {
        edges:
          | null
          | {
              cursor: string;
              node: {
                id: string;
                name: string;
                access: null | string[];
              };
            }[];
      };
    };
  };

  t.deepEqual(target, {
    data: {
      users: {
        edges: [
          {
            node: {
              id: "0cbd3783-0424-4f35-be51-b42f07a2a987",
              name: "Dwight Schrute",
              access: null,
            },
            cursor: "aWQ6MGNiZDM3ODMtMDQyNC00ZjM1LWJlNTEtYjQyZjA3YTJhOTg3",
          },
          {
            node: {
              id: "1691f38d-92c8-4d86-9a89-da99528cfcb5",
              name: "Dunder Mifflin Infinity",
              access: null,
            },
            cursor: "aWQ6MTY5MWYzOGQtOTJjOC00ZDg2LTlhODktZGE5OTUyOGNmY2I1",
          },
          {
            node: {
              id: "306eabbb-cc2b-4f88-be19-4bb6ec98e5c3",
              name: "Toby Flenderson",
              access: null,
            },
            cursor: "aWQ6MzA2ZWFiYmItY2MyYi00Zjg4LWJlMTktNGJiNmVjOThlNWMz",
          },
          {
            node: {
              id: "51192909-3664-44d5-be62-c6b45f0b0ee6",
              name: "Darryl Philbin",
              access: null,
            },
            cursor: "aWQ6NTExOTI5MDktMzY2NC00NGQ1LWJlNjItYzZiNDVmMGIwZWU2",
          },
        ],
      },
    },
  });
});

test("Fetch users incorrect scope", async (t) => {
  const clientContext: ClientContext = {
    clientId: "*",
    type: "client",
  };

  const clientAction: ClientAction = {
    basic: "r",
    secrets: "r",
  };

  const [, token] = await ctx.createLimitedAuthorization([
    createV2AuthXScope("authx", clientContext, clientAction),
  ]);

  const target = (await ctx.graphQL(
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
    token,
  )) as {
    errors?: null | { message: string }[];
    data: null | {
      users: null | {
        edges:
          | null
          | {
              cursor: string;
              node: {
                id: string;
                name: string;
              };
            }[];
      };
    };
  };

  t.deepEqual(
    target,
    {
      data: {
        users: {
          edges: [
            {
              cursor: "aWQ6YTZhMDk0NmQtZWViNC00NWNkLTgzYzYtYzc5MjBmMjI3MmVi",
              node: {
                id: "a6a0946d-eeb4-45cd-83c6-c7920f2272eb",
                name: "Michael Scott",
              },
            },
          ],
        },
      },
    },
    "Only has access to the user associated with the authorization.",
  );
});

test("Fetch users anonymous scope", async (t) => {
  const target = (await ctx.graphQL(`
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
    `)) as {
    errors?: null | { message: string }[];
    data: null | {
      users: null | {
        edges:
          | null
          | {
              cursor: string;
              node: {
                id: string;
                name: string;
              };
            }[];
      };
    };
  };

  t.deepEqual(target, { data: { users: { edges: [] } } });
});
