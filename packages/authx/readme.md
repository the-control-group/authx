This is AuthX. It's named AuthX because it's an "exchange" of sorts, consolidating identities from several upstream authorities into a single identity for downstream clients. AuthX uses the OAuth2 framework in both directions, and adds an _authorization_ layer. Authorization control is based on the [AuthX scope spec](https://github.com/the-control-group/scopeutils).

## Concepts

AuthX is designed for a scenario in which a **RESOURCE** needs to restrict access to all or part of its functionality. A **CLIENT** app, acting on behalf of a **User** can retreive an OAuth authorization from AuthX, which can be passed to the **RESOURCE** with any request.

```
╔══════════════════════════════════════════╗
║                  ┌───────────┐           ║
║                  │ AUTHORITY │           ║
║                  └─────┬─────┘           ║
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
║              ┌───┴────┐ ┌──────────┐     ║
║              │ CLIENT ├─┤ RESOURCE │     ║
║              └────────┘ └──────────┘     ║
╚══════════════════════════════════════════╝
```

### User

The user is (obviously) the primary component. It consists of a unique ID and profile information in the format of [Portable Contacts](http://portablecontacts.net/draft-spec.html). Information in the profile is **not** verified, and is not directly used by AuthX system for authentication.

### Authority

An authority is a mechanism for authentication, and provides the configuration for corresponding units of code called _strategies_. Several strategies are included by default:

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

## Anatomy of a scope

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

## AuthX Scopes

AuthX uses its own authorization system to restrict access to its resources. Below are the scopes used by AuthX internally:

```
AuthX:authority:read. {      details}
AuthX:authority:write.{basic|details|*}

AuthX:client.{assigned|*}:read.{basic|secrets|assignments}
AuthX:client.{assigned|*}:write.{basic|secrets|assignments|*}

AuthX:credential.equal.self  :read .{basic|details}
AuthX:credential.equal.lesser:read .{basic|details}
AuthX:credential.equal.*     :read .{basic|details}
AuthX:credential.*    .*     :read .{basic|details}
AuthX:credential.equal.self  :write.{basic|details|*}
AuthX:credential.equal.lesser:write.{basic|details|*}
AuthX:credential.equal.*     :write.{basic|details|*}
AuthX:credential.*    .*     :write.{basic|details|*}

AuthX:role.equal.assigned:read .{basic|scopes|assignments}
AuthX:role.equal.lesser  :read .{basic|scopes|assignments}
AuthX:role.equal.*       :read .{basic|scopes|assignments}
AuthX:role.*    .*       :read .{basic|scopes|assignments}
AuthX:role.equal.assigned:write.{basic|scopes|assignments|*}
AuthX:role.equal.lesser  :write.{basic|scopes|assignments|*}
AuthX:role.equal.*       :write.{basic|scopes|assignments|*}
AuthX:role.*    .*       :write.{basic|scopes|assignments|*}

AuthX:grant.assigned            :read .{basic|scopes|secrets}
AuthX:grant.equal.self  .granted:read .{basic|scopes|secrets}
AuthX:grant.equal.self  .*      :read .{basic|scopes|secrets}
AuthX:grant.equal.lesser.*      :read .{basic|scopes|secrets}
AuthX:grant.equal.*     .*      :read .{basic|scopes|secrets}
AuthX:grant.*    .*     .*      :read .{basic|scopes|secrets}
AuthX:grant.equal.self  .granted:write.{basic|scopes|secrets|*}
AuthX:grant.equal.self  .*      :write.{basic|scopes|secrets|*}
AuthX:grant.equal.lesser.*      :write.{basic|scopes|secrets|*}
AuthX:grant.equal.*     .*      :write.{basic|scopes|secrets|*}
AuthX:grant.*    .*     .*      :write.{basic|scopes|secrets|*}

AuthX:authorization.assigned            :read .{basic|scopes|secrets}
AuthX:authorization.equal.self  .granted:read .{basic|scopes|secrets}
AuthX:authorization.equal.self  .*      :read .{basic|scopes|secrets}
AuthX:authorization.equal.lesser.*      :read .{basic|scopes|secrets}
AuthX:authorization.equal.*     .*      :read .{basic|scopes|secrets}
AuthX:authorization.*    .*     .*      :read .{basic|scopes|secrets}
AuthX:authorization.equal.self  .granted:write.{basic|scopes|secrets}
AuthX:authorization.equal.self  .*      :write.{basic|scopes|secrets|*}
AuthX:authorization.equal.lesser.*      :write.{basic|scopes|secrets|*}
AuthX:authorization.equal.*     .*      :write.{basic|scopes|secrets|*}
AuthX:authorization.*    .*     .*      :write.{basic|scopes|secrets|*}

AuthX:user.equal.self  :read.{basic}
AuthX:user.equal.lesser:read.{basic}
AuthX:user.equal.*     :read.{basic}
AuthX:user.*    .*     :read.{basic}
AuthX:user.equal.self  :write.{basic|*}
AuthX:user.equal.lesser:write.{basic|*}
AuthX:user.equal.*     :write.{basic|*}
AuthX:user.*    .*     :write.{basic|*}
```

Users must have the following scopes to use OAuth:

```
AuthX:grant.equal.self.*:read.basic
AuthX:grant.equal.self.*:read.scopes
AuthX:grant.equal.self.*:read.secrets
AuthX:authorization.equal.self.*:write.*
```

The following scopes must be granted for a client to take full advantage of OAuth:

```
AuthX:grant.equal.self.granted:read.basic
AuthX:grant.equal.self.granted:read.scopes
AuthX:grant.equal.self.granted:read.secrets
AuthX:authorization.equal.self.granted:write.*
```
