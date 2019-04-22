## Behaviors

### resource-augment

This behavior is useful when the proxy sits in front of a resource and is designed to accept requests from clients. All matching requests are sent to the configured `target`. If a bearer token is present in the `Authorization` header, it will be parsed and verified.

- A request missing a token or containing an **invalid** token will be sent to the `target`, but with empty `X-OAuth-Scopes` and `Authorization` headers.
- A request containing a **valid** token will be sent to the `target` with an `X-OAuth-Scopes` header containing a space-deliminated list of the token's scopes, and retain its original `Authorization` header.

```ts
{
  readonly test: string | RegExp | ((url: string) => boolean);
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
  readonly test: string | RegExp | ((url: string) => boolean);
  readonly behavior: "resource-restrict";
  readonly target: string;
  readonly requiredScopes: string[];
}
```

### client-authorize

This behavior is useful when the proxy sits in front of a web client that is accessed by a human user. Matching requests are not proxied, but are used to exchange OAuth authorization codes for access tokens.

```ts
{
  readonly test: string | RegExp | ((url: string) => boolean);
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
  readonly test: string | RegExp | ((url: string) => boolean);
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
  readonly test: string | RegExp | ((url: string) => boolean);
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
  readonly test: string | RegExp | ((url: string) => boolean);
  readonly behavior: "client-inject";
  readonly target: string;
  readonly clientId: string;
  readonly clientSecret: string;
  readonly refreshToken: string;
}
```
