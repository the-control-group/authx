# HTTP Proxy - Resource

The AuthX proxy for resources is a flexible HTTP proxy designed to sit in front of a resource.

## Example

Here is a typical use case:

We have a resource – often an API – which is accessed by a client. The route `/something` is special, and we only want to give access to authorized users.

```js
new AuthXProxy({
  authxUrl: "https://authx.example.com/",
  rules: [
    // We want to make sure any GET request to /something has been authorized
    // for the `example.resource:something:read` scope:
    {
      test({ url, method }) {
        return method === "GET" && /^\/something\/.+$/.test(url);
      },
      behavior: {
        proxyTarget: "http://127.0.0.1:3000",
        sendTokenToTarget: false,
        requireScopes: ["example.resource:something:read"]
      }
    },

    // We want to make sure any POST or PUT request to /something has been
    // authorized for the `example.resource:something:write` scope:
    {
      test({ url, method }) {
        return (
          (method === "POST" || method === "PUT") &&
          /^\/something\/.+$/.test(url)
        );
      },
      behavior: {
        proxyTarget: "http://127.0.0.1:3000",
        sendTokenToTarget: false,
        requireScopes: ["example.resource:something:write"]
      }
    },

    // For all other paths, we want to let all requests through, but validate
    // any tokens that are present. Here we use the `resource-augment` behavior:
    {
      test() {
        return true;
      },
      behavior: {
        proxyTarget: "http://127.0.0.1:3000",
        sendTokenToTarget: false
      }
    }
  ]
});
```

## Configuration

The proxy is configured with an array of rules, which are checked in order against the request URL until a match is found. If no match is found, the proxy will respond with a status of `404`.

### Behavior

```ts
interface Behavior {
  /**
   * The string URL to which requests will be proxied.
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
  readonly proxyTarget: string;

  /**
   * If set to true, proxied requests will retain the token in their HTTP
   * `Authorization` header. Only valid tokens will be sent to the target.
   *
   * @defaultValue `false`
   */
  readonly sendTokenToTarget?: boolean;

  /**
   * The minimum scopes required for a request to be proxied.
   *
   * @remarks
   * If one or more scopes are configured, the proxy will ensure that they are
   * provided by a valid token, returning a 401 for a missing or invalid token,
   * and a 403 for a valid token that is missing required scopes. The header
   * `X-OAuth-Required-Scopes` will be set on both the request and response,
   * containing a space-deliminated list of the required scopes.
   *
   * To ensure that a valid token is present, use an empty array.
   *
   * If this option is not set, all requests will be proxied to the target.
   */
  readonly requireScopes?: string[];
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

### Config

```ts
interface Config {
  /**
   * The root URL to AuthX server.
   */
  readonly authxUrl: string;

  /**
   * The number of seconds between successful attempts at refreshing public keys
   * from the AuthX server.
   *
   * @defaultValue `60`
   */
  readonly authxPublicKeyRefreshInterval?: number;

  /**
   * The number of seconds between failed attempts at refreshing public keys
   * from the AuthX server.
   *
   * @defaultValue `10`
   */
  readonly authxPublicKeyRetryInterval?: number;

  /**
   * The number of seconds for which the proxy will cache the AuthX server's
   * token introspection response for a revocable token.
   *
   * @defaultValue `60`
   */
  readonly revocableTokenCacheDuration?: number;

  /**
   * The exact URL as set on `IncomingMessage` to which the proxy will reply
   * with a readiness check.
   *
   * @remarks
   * If set, requests to this URL will return a 200 with the body "READY" when
   * the proxy is ready to accept incoming connections, and a 503 with the body
   * "NOT READY" otherwise.
   *
   * When closing the proxy, readiness checks will immediately begin failing,
   * even before the proxy stops accepting requests.
   */
  readonly readinessUrl?: string;

  /**
   * The rules the proxy will use to handle a request.
   */
  readonly rules: Rule[];
}
```

## Details

The resource proxy accepts two kinds of access tokens from AuthX.

### Revocable

> Note: This is not yet implemented!

A revocable token is passed as HTTP Basic credentials in the `Authorization` header. The authorization ID is used as the "username" and the authoriztion secret is used as the "password". For each request with this type of token, the proxy makes a token introspection request to AuthX following [rfc7662](https://tools.ietf.org/html/rfc7662) to ensure that the token is active.

If `revocableTokenCacheDuration` is configured, the proxy will cache the result of the introspection request for the configured number of seconds. Note that proxy instances do not share a cache, so a recently-revoked authorization may have different behavior between instances.

### Self-Contained

A self-contained token is passed as an HTTP Bearer token in the `Authorization` header. The signature is verified using the the AuthX instance's public keys, which are cached for _at least_ the configured `authxPublicKeyRefreshInterval`. Note that if attempts to refresh the public keys fail, the proxy will continue to use its cached public keys to avoid downtime.

The `sub` field of the JWT payload must be the authorization ID, and authorized scopes must be present as an array of strings in the `scopes` field.
