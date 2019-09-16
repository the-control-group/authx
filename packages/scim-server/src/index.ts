import body from "koa-body";
import fetch from "node-fetch";

import Router, { IRouterOptions } from "koa-router";
import { Middleware, ParameterizedContext } from "koa";
import { compileFilter, compileSorter } from "scim-query-filter-parser";

import x from "./x";
import { Config, assertConfig } from "./Config";
import { AuthXKeyCache } from "@authx/http-proxy-resource";

interface Context extends Config {
  keys: ReadonlyArray<string>;
}

export class ScimServer<
  StateT extends any = any,
  CustomT extends { [x]: Context } = { [x]: Context }
> extends Router<StateT, CustomT> {
  private _cache: AuthXKeyCache;

  public constructor(config: Config & IRouterOptions) {
    assertConfig(config);
    super(config);
    this._cache = new AuthXKeyCache(config);

    // Add middleware to check authorization header.
    this.use((async (ctx, next): Promise<void> => {
      const keys = this._cache.keys;
      if (!keys) {
        ctx.response.status = 503;
        ctx.response.body = {
          schema: "urn:ietf:params:scim:api:messages:2.0:Error",
          status: 503,
          scimType: undefined,
          detail: "Service not yet available; loading AuthX keys."
        };

        return;
      }

      ctx[x] = {
        ...config,
        keys
      } as Context;

      await next();
    }) as Middleware<ParameterizedContext<any, any>>);

    // Groups
    // ------

    // Users
    // -----
    this.get(
      "/Users",
      async (ctx, next): Promise<void> => {
        const body = (await (await fetch(ctx[x].authxUrl, {
          method: "POST",
          headers: {
            authorization: ctx.request.header("authorization")
          },
          body: `
            query {
              users {
                edges {
                  node {
                    id
                    name
                    enabled

                    credentials {
                      edges {
                        node {
                          __typename
                          id

                          ...on EmailCredential {
                            email
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          `
        })).json()) as {
          readonly data?: {
            readonly users?: {
              readonly edges: ReadonlyArray<{
                readonly node?: {
                  readonly id: string;
                  readonly name: string;
                  readonly enabled: boolean;
                };
              }>;
            };
          };
        };

        const users =
          body.data &&
          body.data.users &&
          body.data.users.edges &&
          body.data.users.edges
            .map(({ node }) => {
              return (
                node && {
                  userName: Buffer.from(node.id).toString("hex"),
                  id: node.id,
                  displayName: node.name,
                  active: node.enabled
                }
              );
            })
            .filter(u => u);
      }
    );
  }
}

export default ScimServer;
