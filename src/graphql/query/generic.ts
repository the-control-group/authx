import test from "ava";
import { FunctionalTestContext } from "../../util";

export interface PagingTestsConfig {
  testName: string;
  endpointName?: string;
  entityType: string;

  // Because authorizations are generated on the fly, their ID is not known in
  // advance. However, these test authorizations are guaranteed to start with
  // `ffff` and should therefore sort predictably. Use `null` here as a
  // placeholder for the current authorization ID.
  ids: (string | null)[];
  scopes: string[];
  ctx: FunctionalTestContext;
  public?: boolean;
}

export function pagingTests(config: PagingTestsConfig): void {
  if (!config.endpointName) config.endpointName = `${config.entityType}s`;

  const endpointName = config.endpointName;
  if (!endpointName) throw "Need an endpoint name";

  test(`Forward paging for ${config.endpointName}, ${config.testName}`, async (t) => {
    const [currentAuthorizationId, token] =
      await config.ctx.createLimitedAuthorization(config.scopes);

    let lastCursor: string | null = null;

    for (let i = 0; i < config.ids.length; ++i) {
      const dataRaw = (await config.ctx.graphQL(
        `
        query {
          ${config.endpointName}(first:1${
          lastCursor ? ', after:"' + lastCursor + '"' : ""
        }) {
            edges {
              node {
                id
              }
              cursor
            }
            pageInfo {
              hasNextPage
              hasPreviousPage
              startCursor
              endCursor
            }
          }
        }
        `,
        token
      )) as {
        errors?: null | [{ message: string }];
        data: any;
      };

      if (dataRaw.errors?.length) {
        throw new Error(
          dataRaw.errors.map(({ message }) => message).join("; ")
        );
      }

      const data = dataRaw.data[endpointName];

      t.assert(data.edges !== null);
      t.assert(
        data.edges.length == 1,
        `Index ${i}: Expected ${data.edges.length} to be 1`
      );

      const expectedId = config.ids[i] ?? currentAuthorizationId;
      t.assert(
        data.edges[0].node.id == expectedId,
        `Index ${i}: Expected ${data.edges[0].node.id} to be ${expectedId}`
      );

      lastCursor = data.edges[0].cursor;

      const expectNextPage = i < config.ids.length - 1;

      t.assert(data.pageInfo.hasNextPage == expectNextPage);
      t.assert(!data.pageInfo.hasPreviousPage);
      t.assert(
        data.pageInfo.startCursor == data.edges[0].cursor,
        `Expecting ${data.pageInfo.startCursor} == ${data.edges[0].cursor}`
      );
      t.assert(
        data.pageInfo.endCursor == data.edges[data.edges.length - 1].cursor,
        `Expected ${data.pageInfo.endCursor} == ${
          data.edges[data.edges.length - 1].cursor
        }`
      );
    }
  });

  test(`Reverse paging for ${config.endpointName}, ${config.testName}`, async (t) => {
    const [currentAuthorizationId, token] =
      await config.ctx.createLimitedAuthorization(config.scopes);

    let lastCursor: string | null = null;

    for (let i = config.ids.length - 1; i >= 0; --i) {
      const dataRaw = (await config.ctx.graphQL(
        `
        query {
          ${config.endpointName}(last:1${
          lastCursor ? ', before:"' + lastCursor + '"' : ""
        }) {
            edges {
              node {
                id
              }
              cursor
            }
            pageInfo {
              hasNextPage
              hasPreviousPage
              startCursor
              endCursor
            }
          }
        }
        `,
        token
      )) as {
        errors?: null | [{ message: string }];
        data: any;
      };

      if (dataRaw.errors?.length) {
        throw new Error(
          dataRaw.errors.map(({ message }) => message).join("; ")
        );
      }

      const data = dataRaw.data[endpointName];

      t.assert(data.edges !== null);
      t.assert(
        data.edges.length == 1,
        `Index ${i}: Expected ${data.edges.length} to be 1`
      );

      const expectedId = config.ids[i] ?? currentAuthorizationId;

      t.assert(
        data.edges[0].node.id == expectedId,
        `Index ${i}: Expected ${data.edges[0].node.id} to be ${expectedId}`
      );

      lastCursor = data.edges[0].cursor;

      const expectNextPage = i > 0;

      t.assert(data.pageInfo.hasPreviousPage == expectNextPage);
      t.assert(!data.pageInfo.hasNextPage);
      t.assert(
        data.pageInfo.startCursor == data.edges[0].cursor,
        `Expecting ${data.pageInfo.startCursor} == ${data.edges[0].cursor}`
      );
      t.assert(
        data.pageInfo.endCursor == data.edges[data.edges.length - 1].cursor,
        `Expected ${data.pageInfo.endCursor} == ${
          data.edges[data.edges.length - 1].cursor
        }`
      );
    }
  });

  if (!config.public) {
    test(`should not allow querying on unrelated ${config.endpointName}, ${config.testName}`, async (t) => {
      const [currentAuthorizationId, token] =
        await config.ctx.createLimitedAuthorization([
          "authx:v2.*.*.*.*.*.*.*.e3e67ba0-626a-4fb6-ad86-6520d4acfaf7:**",
        ]);

      const endpointName = config.endpointName || "???";

      const roles: any = await config.ctx.graphQL(
        `query {
      ${endpointName} {
        edges {
          node {
            id
          }
        }
      }
    }`,
        token
      );

      const expected: any = {
        data: {},
      };

      expected.data[endpointName] = {
        edges:
          // This is a special case to handle authorizations, which when active
          // always have the ability to view themselves.
          config.endpointName === "authorizations"
            ? [
                {
                  node: {
                    id: currentAuthorizationId,
                  },
                },
              ]
            : [],
      };

      t.deepEqual(roles, expected);
    });
  }
}
