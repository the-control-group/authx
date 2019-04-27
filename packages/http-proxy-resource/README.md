# HTTP Proxy - Resource

The AuthX proxy for resources is a flexible HTTP proxy designed to sit in front of a resource.

## Configuration

The proxy is configured with an array of rules, which are checked in order against the request URL until a match is found. If no match is found, the proxy will respond with a status of `404`.

Here is a typical use case:

We have a resource – often an API – which is accessed by a client. The route `/something` is special, and we only want to give access to authorized users.

```js
new AuthXProxy({
  authxUrl: "https://authx.example.com/",
  authxPublicKeyRefreshInterval: 300, // 300 seconds = 5 minutes
  revocableTokenCacheDuration: 60, // 60 seconds = 1 minute
  rules: [
    // We want to make sure any GET request to /something has been authorized
    // for the `example.resource:something:read` scope:
    {
      test({ url, method }) {
        return (
          method === "GET" &&
          /^https?:resource\.example\.com\/something\/.+$/.test(url)
        );
      },
      behavior: {
        proxyTarget: "http://127.0.0.1:3000",
        proxyTokenToTarget: false,
        requireValidToken: true,
        requireScopes: ["example.resource:something:read"]
      }
    },

    // We want to make sure any POST or PUT request to /something has been
    // authorized for the `example.resource:something:write` scope:
    {
      test({ url, method }) {
        return (
          (method === "POST" || method === "PUT") &&
          /^https?:resource\.example\.com\/something\/.+$/.test(url)
        );
      },
      behavior: {
        proxyTarget: "http://127.0.0.1:3000",
        proxyTokenToTarget: false,
        requireValidToken: true,
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
        proxyTokenToTarget: false,
        requireValidToken: false
      }
    }
  ]
});
```

## Behaviors

### augment

This behavior is useful when the proxy sits in front of a resource and is designed to accept requests from clients. All matching requests are sent to the configured `target`. If a bearer token is present in the `Authorization` header, it will be parsed and verified.

- A request missing a token or containing an **invalid** token will be sent to the `target`, but with empty `X-OAuth-Scopes` and `Authorization` headers.
- A request containing a **valid** token will be sent to the `target` with an `X-OAuth-Scopes` header containing a space-deliminated list of the token's scopes, and retain its original `Authorization` header.

```ts
{
  test: (request: { method: string; url: URL }) => boolean;
  behavior: "augment";
  target: string;
}
```

### restrict

This behavior is useful when the proxy sits in front of a resource and is designed to accept requests from clients. All matching requests are checked for a bearer token in the `Authorization` header.

- A request missing a token or containing an **invalid** token will not be sent to the configured `target`; the proxy will respond with a status of `401` and an empty body.
- A request containing a **valid** token but **missing any scope configured in `requiredScopes`** will not be sent to the configured `target`; the proxy will respond with a status of `403` and an empty body.
- A request containing a **valid** token and **including every scope configured in `requiredScopes`** will be sent to the configured `target` with an `X-OAuth-Scopes` header containing a space-deliminated list of the token's scopes, and retain its original `Authorization` header.

```ts
{
  test: ((request: { method: string, url: URL }) => boolean);
  behavior: "restrict";
  target: string;
  requiredScopes: string[];
}
```

## Details

The resource proxy accepts two kinds of access tokens from AuthX.

### Revocable

A revocable token is passed as HTTP Basic credentials in the `Authorization` header. The authorization ID is used as the "username" and the authoriztion secret is used as the "password". For each request with this type of token, the proxy makes a token introspection request to AuthX following [rfc7662](https://tools.ietf.org/html/rfc7662) to ensure that the token is active.

If `revocableTokenCacheDuration` is configured, the proxy will cache the result of the introspection request for the configured number of seconds. Note that proxy instances do not share a cache, so a recently-revoked authorization may have different behavior between instances.

### Self-Contained

A self-contained token is passed as an HTTP Bearer token in the `Authorization` header. The signature is verified using the the AuthX instance's public keys, which are cached for _at least_ the configured `authxPublicKeyRefreshInterval`. Note that if attempts to refresh the public keys fail, the proxy will continue to use its cached public keys to avoid downtime.

The `sub` field of the JWT payload must be the authorization ID, and authorized scopes must be present as a space-separated string in the `scopes` field.
