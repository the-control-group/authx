# AuthX

This is AuthX. It's named AuthX because it's an "exchange" of sorts, consolidating identities from several upstream authorities into a single identity for downstream clients. AuthX uses the OAuth2 framework in both directions, and adds a robust access control system, based on the [AuthX scope spec](packages/scopes#README.md).

[![Build Status](https://travis-ci.org/the-control-group/authx.svg?branch=master)](https://travis-ci.org/the-control-group/authx)

---

## Contributing

Please see [CONTRIBUTING.md](./CONTRIBUTING.md).

---

## Packages

This is a monorepo that contains several useful node packages:

### AuthX

The AuthX package contains the core application and API manages users, credentials, roles, clients, authorities, grants, and tokens.

[Read More](packages/authx#README.md)

### HTTP Proxy - Client

This package includes an HTTP proxy which can be used by a client in a trusted context (such as a private network) to inject credentials into a request. This eases incremental adoption of AuthX, allowing clients to remain unaware of the authorization layer.

[Read More](packages/http-proxy-client#README.md)

### HTTP Proxy - Resource

This package includes an HTTP proxy which can be put in front of a resource. It verifies and caches access tokens, manages public keys, and injects verified scopes directly into the proxied request.

[Read More](packages/http-proxy-resource#README.md)

### HTTP Proxy - Web

This package includes an HTTP proxy which can be put in front of a web client. It takes on the responsibility of managing OAuth flows, and can inject credentials into the proxied requests to resources.

[Read More](packages/http-proxy-web#README.md)

### Interface

The AuthX Interface is a reference user interface that provides the visual components necessary for a user to authenticate herself and authorize a client to access resources on her behalf.

The small, react-powered app features a pluggable architecture that can be used to support additional authorization strategies.

[Read More](packages/interface#README.md)

### Scopes

This package contains a small collection of utility functions for AuthX scopes. These scopes are human-readable, fully OAuth2-compatible, and support both pattern matching and set algebra.

[Read More](packages/scopes#README.md)

### Strategy - Email

This package contains the email authentication strategy.

[Read More](packages/strategy-email#README.md)

### Strategy - OpenID

This package contains the OpenID authentication strategy.

[Read More](packages/strategy-openid#README.md)

### Strategy - Password

This package contains the password authentication strategy.

[Read More](packages/strategy-password#README.md)

### Tools

This package contains a CLI and small collection of utility functions for interacting with an AuthX instance.

[Read More](packages/tools#README.md)
