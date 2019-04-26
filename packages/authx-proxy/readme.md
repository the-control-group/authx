## Configuration

The AuthX proxy is a flexible HTTP proxy designed to sit in front of a resource, in front of a client, or behind a client.

The proxy is configured with an array of rules, which are checked against the request URL in order until, a match is found. If no match is found, the proxy will respond with a status of `404`.

Here are some common use-cases:

### Protecting A Resource

In this case, we have a resource – often an API – which is accessed by a client. The route `/something` is special, and we only want to give access to authorized users.

```js
new AuthXProxy({
  authxUrl: "https://authx.example.com/",
  authxPublicKeyCacheRefreshInterval: 300, // 300 seconds = 5 minutes
  rules: [
    // We want to make sure any GET request to /something has been authorized
    // for the `example.resource:something:read` scope:
    {
      test: ({ url, method }) =>
        method === "GET" &&
        /^https?:resource\.example\.com\/something\/.+$/.test(url),
      behavior: "resource-restrict",
      target: "http://127.0.0.1:3000",
      requiredScopes: ["example.resource:something:read"]
    },

    // We want to make sure any POST or PUT request to /something has been
    // authorized for the `example.resource:something:write` scope:
    {
      test: ({ url, method }) =>
        (method === "POST" || method === "PUT") &&
        /^https?:resource\.example\.com\/something\/.+$/.test(url),
      behavior: "resource-restrict",
      target: "http://127.0.0.1:3000",
      requiredScopes: ["example.resource:something:write"]
    },

    // For all other paths, we want to let all requests through, but validate
    // any tokens that are present. Here we use the `resource-augment` behavior:
    {
      test: () => true,
      behavior: "resource-augment",
      target: "http://127.0.0.1:3000"
    }
  ]
});
```

### Wrapping A Web Client

In this case, we have a web app that needs to run on behalf of a user. Only the "admin" section of the UI requires a user to be logged in, while the rest of the app is navigable by anyone.

The front-end needs to be able to make calls two external resources: `resource-a` and `resource-b`. One of these resources contains information that is especially sensitive, so it's important that the tokens passed to each resource have the minimum permissions necessary.

```js
new AuthXProxy({
  authxUrl: "https://authx.example.com/",
  authxPublicKeyCacheRefreshInterval: 300, // 300 seconds = 5 minutes
  rules: [
    // We want to make sure any GET request to /something has been authorized
    // for the `example.resource:something:read` scope:
    {
      test: ({ url }) =>
        /^https?:resource\.example\.com\/something\/.+$/.test(url),
      behavior: "resource-restrict",
      target: "http://127.0.0.1:3000",
      requiredScopes: ["example.resource:something:read"]
    },

    // We want to make sure any POST or PUT request to /something has been
    // authorized for the `example.resource:something:write` scope:
    {
      test: ({ url, method }) =>
        (method === "POST" || method === "PUT") &&
        /^https?:resource\.example\.com\/something\/.+$/.test(url),
      behavior: "client-restrict",
      target: "http://127.0.0.1:3000",
      requiredScopes: [],
      requestedScopes: [
        "example.resource-a:something:**",
        "example.resource-b:something:**"
      ],
      passedScopes: ["example.resource-a:something:**"]
    },

    // For all other paths, we want to let all requests through, but validate
    // any tokens that are present. Here we use the `resource-augment` behavior:
    {
      test: () => true,
      behavior: "client-augment",
      target: "http://127.0.0.1:3000"
    }
  ]
});
```

## Behaviors

### resource-augment

This behavior is useful when the proxy sits in front of a resource and is designed to accept requests from clients. All matching requests are sent to the configured `target`. If a bearer token is present in the `Authorization` header, it will be parsed and verified.

- A request missing a token or containing an **invalid** token will be sent to the `target`, but with empty `X-OAuth-Scopes` and `Authorization` headers.
- A request containing a **valid** token will be sent to the `target` with an `X-OAuth-Scopes` header containing a space-deliminated list of the token's scopes, and retain its original `Authorization` header.

```ts
{
  readonly test: ((request: { method: string, url: URL }) => boolean);
  readonly behavior: "resource-augment";
  readonly target: string;
}
```

### resource-restrict

This behavior is useful when the proxy sits in front of a resource and is designed to accept requests from clients. All matching requests are checked for a bearer token in the `Authorization` header.

- A request missing a token or containing an **invalid** token will not be sent to the configured `target`; the proxy will respond with a status of `401` and an empty body.
- A request containing a **valid** token but **missing any scope configured in `requiredScopes`** will not be sent to the configured `target`; the proxy will respond with a status of `403` and an empty body.
- A request containing a **valid** token and **including every scope configured in `requiredScopes`** will be sent to the configured `target` with an `X-OAuth-Scopes` header containing a space-deliminated list of the token's scopes, and retain its original `Authorization` header.

```ts
{
  readonly test: ((request: { method: string, url: URL }) => boolean);
  readonly behavior: "resource-restrict";
  readonly target: string;
  readonly requiredScopes: string[];
}
```

### client-authorize

This behavior is useful when the proxy sits in front of a web client that is accessed by a human user. Matching requests are not proxied, but are used to exchange OAuth authorization codes for access tokens.

```ts
{
  readonly test: ((request: { method: string, url: URL }) => boolean);
  readonly behavior: "resource-authorize";
  readonly clientId: string;
  readonly clientSecret: string;
  readonly clientUrl: string;
}
```

The following cookies are used by this behavior, and are available to the client.

```
authx-proxy.token
authx-proxy.refreshToken
authx-proxy.destinationUrl
```

### client-augment

This behavior is useful when the proxy sits in front of a web client that is accessed by a human user. All matching requests are sent to the configured `target`. If a bearer token is present in the `authx-proxy.token` cookie, it will be parsed and verified.

- A request missing a token or containing an **invalid** token will be sent to the `target`, but with empty `X-OAuth-Scopes` and `Authorization` headers.
- A request containing a **valid** token will be sent to the `target` with an `X-OAuth-Scopes` header containing a space-deliminated list of the token's scopes, and an `Authorization` header containing the bearer token.

```ts
{
  readonly test: ((request: { method: string, url: URL }) => boolean);
  readonly behavior: "client-augment";
  readonly target: string;
  readonly clientUrl: string;
}
```

The following cookies are used by this behavior, and are available to the client.

```
authx-proxy.token
authx-proxy.refreshToken
authx-proxy.destinationUrl
```

### client-restrict

This behavior is useful when the proxy sits in front of a web client that is accessed by a human user. All matching requests are checked for a bearer token in the `authx-proxy.token` cookie.

- A request missing a token or containing an **invalid** token will not be sent to the configured `target`; the proxy will respond with a status of `302` redirecting the user to the AuthX authorization interface.
- A request containing a **valid** token but **missing any scope configured in `requiredScopes`** will not be sent to the configured `target`; the proxy will respond with a status of `403` and an empty body.
- A request containing a **valid** token will be sent to the `target` with an `X-OAuth-Scopes` header containing a space-deliminated list of the token's scopes, and an `Authorization` header containing the bearer token.

```ts
{
  readonly test: ((request: { method: string, url: URL }) => boolean);
  readonly behavior: "client-restrict";
  readonly target: string;
  readonly clientUrl: string;
}
```

The following cookies are used by this behavior, and are available to the client.

```
authx-proxy.token
authx-proxy.refreshToken
authx-proxy.destinationUrl
```

### client-inject

This behavior is useful when the proxy sits behind a client that wishes to use pre-configured credentials to interact with a resource. The proxy is configured with a `refreshToken` which is used to fetch the short-lived bearer access tokens supplied to the configured `target` in the `Authorization` header.

```ts
{
  readonly test: ((request: { method: string, url: URL }) => boolean);
  readonly behavior: "client-inject";
  readonly target: string;
  readonly clientId: string;
  readonly clientSecret: string;
  readonly refreshToken: string;
}
```