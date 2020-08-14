# HTTP Proxy - Client

The AuthX proxy for resources is a flexible HTTP proxy that can inject access tokens into a request. It is designed to be deployed alongside an app or worker, and maintains an in-memory cache of fresh access tokens to add the minimun amount of latency. It relies on refresh tokens specified in the configuration or provided by rules.

## Example

Here is a typical use case:

We have a resource – often an API – which is accessed by a client. The route `/something` is special, and we only want to give access to authorized users.

```js
import AuthXAuthorizationProxy from "@authx/http-proxy-client";
proxy = new AuthXAuthorizationProxy({
  authxUrl: `http://127.0.0.1:${mockAuthX.port}`,
  clientId: "b22282bf-1b78-4ffc-a0d6-2da5465895d0",
  clientSecret: "de2c693f-b654-4cf2-b3db-eb37a36bc7a9",
  readinessEndpoint: "/_ready",
  rules: [
    // For this route, we will proxy the request without injecting a token into
    // the request.
    {
      test({ url }) {
        return url === "/no-token";
      },
      behavior: {
        proxyOptions: { target: `http://127.0.0.1:${mockTarget.port}` }
      }
    },

    // For this route, we will inject a token that is fetched using a single
    // refresh token specified in an environment variable.
    {
      test({ url }) {
        return url === "/with-static-token-and-scopes";
      },
      behavior: {
        proxyOptions: { target: `http://127.0.0.1:${mockTarget.port}` },
        refreshToken: process.env.REFRESH_TOKEN,
        sendTokenToTargetWithScopes: ["foo:**:**"]
      }
    },

    // For this route, we will inject a token that is fetched using a refresh
    // token specified in the incoming request. We will also take care to remove
    // the refresh token from the proxied request.
    {
      test({ url }) {
        return url === "/with-dynamic-token-and-scopes";
      },
      behavior(request) {
        const refreshToken = request.headers["x-oauth-refresh-token"];
        delete request.headers["x-oauth-refresh-token"];
        return {
          proxyOptions: { target: `http://127.0.0.1:${mockTarget.port}` },
          refreshToken,
          sendTokenToTargetWithScopes: ["**:**:**"]
        };
      }
    }
  ]
});
```

## Configuration

The proxy is configured with an array of rules, which are checked in order against the request URL until a match is found. If no match is found, the proxy will respond with a status of `404`.

### Config

```ts
interface Config {
  /**
   * The root URL to AuthX server.
   */
  readonly authxUrl: string;

  /**
   * The ID assigned to this client by AuthX.
   */
  readonly clientId: string;

  /**
   * A secret assigned to this client by AuthX.
   */
  readonly clientSecret: string;

  /**
   * The pathname at which the proxy will provide a readiness check.
   *
   * @remarks
   * Requests to this path will return a 200 with the body "READY" when the
   * proxy is ready to accept incoming connections, and a 503 with the body
   * "NOT READY" otherwise.
   *
   * When closing the proxy, readiness checks will immediately begin failing,
   * even before the proxy stops accepting requests.
   *
   * If not set, the path `/_ready` will be used.
   */
  readonly readinessEndpoint?: string;

  /**
   * Cached access tokens will be refreshed this amount of time in seconds
   * before they would otherwise expire.
   *
   * @defaultValue `60`
   */
  readonly refreshCachedTokensAtRemainingLife?: number;

  /**
   * The number of seconds to wait before aborting and retrying a request for
   * an access token from the AuthX server.
   *
   * @defaultValue `30`
   */
  readonly refreshCachedTokensRequestTimeout?: number;

  /**
   * The number of seconds between failed attempts at refreshing access tokens
   * from the AuthX server.
   *
   * @defaultValue `10`
   */
  readonly refreshCachedTokensRetryInterval?: number;

  /**
   * When a token is unused for this amount of time in seconds, it will be
   * removed from the cache, and no longer kept fresh.
   *
   * @defaultValue `600`
   */
  readonly evictDormantCachedTokensThreshold?: number;

  /**
   * The rules the proxy will use to handle a request.
   */
  readonly rules: Rule[];
}
```

### Rule

```ts
interface Rule {
  /**
   * Each rule is tested in order, with the first to return `true` used to
   * handle the request. This function MUST NOT manipulate the `request` object.
   */
  readonly test: (request: IncomingMessage) => boolean;

  /**
   * The behavior to use for a matching request.
   *
   * @remarks
   * If the request must be modified, such as to change the URL path, a custom
   * function can be used here. This function will be called _after_ the
   * `X-OAuth-Scopes` headers have been set or removed.
   *
   * If the function handles the request (such as returning an error), it must
   * return `undefined` to prevent the proxy from also attempting to handle it;
   * otherwise, it should return a `Behavior` config.
   */
  readonly behavior:
    | Behavior
    | ((
        request: IncomingMessage,
        response: ServerResponse
      ) => Behavior | undefined);
}
```

### Behavior

```ts
interface Behavior {
  /**
   * The options to pass to node-proxy.
   *
   * @remarks
   * The HTTP header `X-OAuth-Scopes` will be set on both the request and
   * response, containing a space-deliminated list of authorized scopes from a
   * valid token.
   *
   * If a valid token contains no scopes, the `X-OAuth-Scopes` will be an empty
   * string.
   *
   * If no token exists, or the token is invalid, the `X-OAuth-Scopes` will be
   * removed from both the request and response.
   */
  readonly proxyOptions: ServerOptions;

  /**
   * The refresh token to use when requesting an access token from AuthX.
   */
  readonly refreshToken?: string;

  /**
   * Pass a token to the target, restricting scopes to those provided.
   *
   * @remarks
   * If unspecified, the proxy will forward the request to the target without a
   * token, whether the user has authenticated the client or not. To only ensure
   * the user is authenticated and has authorized the client in some capacity,
   * use an empty array here.
   *
   * This is generally used to limit the token to the scopes needed by the
   * request. For example, if we are authorized to:
   *
   * - lunch:apple:eat
   * - recess:ball:throw
   *
   * ...and we want to send a token to the "cafeteria" resource that _only_ has
   * access to "lunch" resources, we can limit it with: [ "lunch:**:**" ]
   */
  readonly sendTokenToTargetWithScopes?: string[];
}
```

## Development

### Scripts

These scripts can be run using `npm run <script>` or `yarn <script>`.

#### `format`

Use prettier to format the code in this package.

#### `lint`

Check the contents of this package against prettier and eslint rules.

#### `prepare`

Build the files from `/src` to the `/dist` directory with optimizations.

#### `prepare:development`

Build the files from `/src` to the `/dist` directory, and re-build as changes are made to source files.

#### `test`

Run all tests from the `/dist` directory.

#### `test:development`

Run all tests from the `/dist` directory, and re-run a test when it changes.

### Files

#### [/src](src/)

This holds the source code for the proxy.

#### [/dist](dist/)

The compiled and bundled code ends up here for distribution. This is ignored by git.
