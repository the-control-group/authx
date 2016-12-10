[![wercker status](https://app.wercker.com/status/fe30b946cc0ec765b7f89d03ae512793/s/master "wercker status")](https://app.wercker.com/project/bykey/fe30b946cc0ec765b7f89d03ae512793)

This is the TCG auth service. It's named AuthX because it's an "exchange" of sorts, consolidating upstream identities from several authorities into a single identity for downstream clients. AuthX uses the (kinda disgusting) OAuth2 framework in both directions, and adds an *authorization* layer. Authorizations are based on the [simple scopes spec](https://github.com/the-control-group/scopeutils).


Concepts
--------

### User
The user is (obviously) the primary component. It consists of a unique ID and profile information in the format of [Portable Contacts](http://portablecontacts.net/draft-spec.html). Information in the profile is **not** verified, and is not directly used by AuthX system for authentication.


### Authority
An authority is a mechanism for authentication, and provides the configuration for corresponding units of code called *strategies*. Several strategies are included by default:

1. **email** - use an email address to verify a visitor's identity (most people call this "reset your password")
2. **password** - verify your identity with a password (which is protected with bcrypt)
3. **google** - connect to one or more Google and Google Apps accounts
4. **onelogin** - connect to one or more OneLogin accounts through SAML


### Credential
Credentials connect users to authorities. A user can typically have multiple authorities of the same authority (multiple emails, for example).

### Client
Clients are downstream applications that uses AuthX for authentication/authorization.

### Grant
A user gives a client permission to act on her behalf via a grant.

### Role
A role bestows its permissions to every user it includes.


```
╔══════════════════════════════════════════╗
║                                          ║
║            Upstream Providers            ║
║                                          ║
║                        │                 ║
║▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓║
║   ┌────────────┐ ┌─────┴─────┐           ║
║   │ Credential ├─┤ Authority │           ║
║   └───┬────────┘ └───────────┘           ║
║   ┌───┴──┐              Authentication   ║
║░░░│ User │░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░║
║   └─┬──┬─┘              ┌──────┐         ║
║     │  └────────────────┤ Role │         ║
║    ┌┴──────┐ ┌────────┐ └──────┘         ║
║    │ Grant ├─┤ Client │                  ║
║    └───────┘ └───┬────┘  Authorization   ║
║▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓║
║                  │                       ║
║                                          ║
║            Downstream Clients            ║
║                                          ║
╚══════════════════════════════════════════╝
```


Anatomy of a scope
------------------
Scopes are composed of 3 domains, separated by the `:` character:

```
AuthX:role.abc:read
|___| |______| |__|
  |      |       |
realm resource  action

```

Each domain can contain parts, separated by the `.` character. Domain parts can be `/[a-zA-Z0-9_]*/` strings or glob pattern identifiers `*` or `**`:

```
role.abc
role.*
**
```



AuthX Scopes
------------
AuthX dogfoods. It uses its own authorization system to restrict access to its resources. Below are the scopes used by AuthX internally:

```
AuthX:user:create
AuthX:user:read
AuthX:user:update
AuthX:user:delete

AuthX:me:read
AuthX:me:update
AuthX:me:delete

AuthX:role:create
AuthX:role.<role_id>:read
AuthX:role.<role_id>:update
AuthX:role.<role_id>:update.scopes
AuthX:role.<role_id>:update.assignments
AuthX:role.<role_id>:delete

AuthX:authority:create
AuthX:authority.<authority_id>:read
AuthX:authority.<authority_id>:update
AuthX:authority.<authority_id>:delete

AuthX:credential.<authority_id>.user:create
AuthX:credential.<authority_id>.user:read
AuthX:credential.<authority_id>.user:update
AuthX:credential.<authority_id>.user:delete

AuthX:credential.<authority_id>.me:create
AuthX:credential.<authority_id>.me:read
AuthX:credential.<authority_id>.me:update
AuthX:credential.<authority_id>.me:delete

AuthX:client:create
AuthX:client.<client_id>:read
AuthX:client.<client_id>:update
AuthX:client.<client_id>:update.scopes
AuthX:client.<client_id>:delete

AuthX:grant.<client_id>.user:create
AuthX:grant.<client_id>.user:read
AuthX:grant.<client_id>.user:update
AuthX:grant.<client_id>.user:delete

AuthX:grant.<client_id>.me:create
AuthX:grant.<client_id>.me:read
AuthX:grant.<client_id>.me:update
AuthX:grant.<client_id>.me:delete
```
