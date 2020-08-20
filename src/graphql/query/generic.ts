import test from "ava";
import { FunctionalTestContext } from "../../util";

export interface PagingTestsConfig {
  testName: string;
  endpointName?: string;
  entityType: string;
  ids: string[];
  scopes: string[];
  ctx: FunctionalTestContext;
}

export function pagingTests(config: PagingTestsConfig): void {
  if (!config.endpointName) config.endpointName = `${config.entityType}s`;

  const endpointName = config.endpointName;
  if (!endpointName) throw "Need an endpoint name";

  test(`Forward paging for ${config.endpointName}, ${config.testName}`, async t => {
    const token = await config.ctx.createLimitedAuthorization(config.scopes);

    let lastCursor: string | null = null;

    for (let i = 0; i < config.ids.length; ++i) {
      const dataRaw: any = await config.ctx.graphQL(
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
      );

      const data = dataRaw[endpointName];

      t.assert(data.edges !== null);
      t.assert(
        data.edges.length == 1,
        `Index ${i}: Expected ${data.edges.length} to be 1`
      );
      t.assert(
        data.edges[0].node.id == config.ids[i],
        `Index ${i}: Expected ${data.edges[0].node.id} to be ${config.ids[i]}`
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

  test(`Reverse paging for ${config.endpointName}, ${config.testName}`, async t => {
    const token = await config.ctx.createLimitedAuthorization(config.scopes);

    let lastCursor: string | null = null;

    for (let i = config.ids.length - 1; i >= 0; --i) {
      const dataRaw: any = await config.ctx.graphQL(
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
      );

      const data = dataRaw[endpointName];

      t.assert(data.edges !== null);
      t.assert(
        data.edges.length == 1,
        `Index ${i}: Expected ${data.edges.length} to be 1`
      );
      t.assert(
        data.edges[0].node.id == config.ids[i],
        `Index ${i}: Expected ${data.edges[0].node.id} to be ${config.ids[i]}`
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
}
