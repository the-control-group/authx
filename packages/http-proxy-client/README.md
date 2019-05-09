# HTTP Proxy - Client

The AuthX proxy for clients is a flexible HTTP proxy designed to sit in front of a client and manage the entire OAuth flow.

---

[Example](#example) | [Configuration](#configuration) | [Development](#development)

---

## Example

Here is a typical use case:

We have a resource – often an API – which is accessed by a client. The route `/something` is special, and we only want to give access to authorized users.

```js
proxy = new AuthXClientProxy({
  authxUrl: `http://127.0.0.1:${mockAuthX.port}`,

  // These need to match the values for your client in AuthX.
  clientId: "3ac01e62-faba-4644-b4c0-7979775717ac",
  clientSecret: "279b6f23893778b5edf981867a78a86d60c9bd3d",
  clientUrl: "http://127.0.0.1:5734",

  // These are the scopes your client will request from users.
  requestGrantedScopes: ["AuthX:user.equal.self:read.basic"],

  rules: [
    // We want the front-end to be able to access the AuthX API without managing
    // credentials. To do this, we create a proxy that injects a token with all
    // the necessary scopes and nothing more.
    {
      test({ method, url }) {
        return method === "POST" && url === "/api/authx";
      },
      behavior(request) {
        // Rewrite the URL to match the API's expectations.
        request.url = "/graphql";

        // Because this is an API request, we don't want to redirect the browser
        // so we will return a 407 and include a `Location` header which the
        // front-end can use to redirect the user.
        return {
          proxyTarget: `http://127.0.0.1:${mockTarget.port}`,
          sendAuthorizationResponseAs: 407,
          sendTokenToTargetWithScopes: ["authx.prod:**:**"]
        };
      }
    },
    // These are static assets that we want publically cached by Google Cloud
    // CDN or Cloudflare. We won't require any auth for these endpoints.
    {
      test({ method, url }) {
        return method === "GET" && /^\/static(\/.*)?$/.test(url || "");
      },
      behavior: {
        proxyTarget: `http://127.0.0.1:${mockTarget.port}`
      }
    },
    // The rest of our routes render a single-page-app. We simply want to make
    // sure that we're
    {
      test() {
        return true;
      },

      // These requests are likely made directly by the user, so we can simply
      // redirect the user if we require more granted priviliges. Additionally,
      // we don't need to generate a token for this target, so we can leave off
      // `sendTokenToTargetWithScopes`. However, we still do want to ensure that
      // the user is authenticated and has granted us scopes that are necessary
      // for the app to work, so we will set `requireGrantedScopes`.
      behavior: {
        proxyTarget: `http://127.0.0.1:${mockTarget.port}`,
        sendAuthorizationResponseAs: 303,
        sendTokenToTargetWithScopes: []
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
   * The URL at which the proxy will provide the OAuth client functionality.
   */
  readonly clientUrl: string;

  /**
   * The scopes to request from the user.
   */
  readonly requestGrantedScopes: string[];

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
   * If unspecified, the path `/_ready` will be used.
   */
  readonly readinessEndpoint?: string;

  /**
   * When the proxy injects a token into a request, it makes sure that the token
   * will remain valid for this amount of time in seconds; otherwise it will
   * request a new token from AuthX to use.
   *
   * If unspecified, 30 seconds will be used.
   */
  readonly tokenMinimumRemainingLife?: number;

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
   * The string URL to which requests will be proxied.
   */
  readonly proxyTarget: string;

  /**
   * The HTTP status to use if the proxy requires authorization.
   *
   * @remarks
   * 303 - This will return a 303 to redirect the browser to AuthX for
   * authorization. After authorizing the proxy, the user will be returned to
   * the requested page if the initial request was a GET request, or to the URL
   * set in the referer header. Use this for endpoints with which a human user
   * directly interacts.
   *
   * 407 - This will return a 407 with a `Location` header designating the AuthX
   * URL to which the user should be directed for authorization. After
   * authorizing the proxy, the user will be returned to the URL set in the
   * referer header. Use this for endpoints with which a client-side app
   * interacts using `fetch` or `XMLHttpRequest`.
   */
  readonly sendAuthorizationResponseAs?: 303 | 407;

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

