# AuthX

This is AuthX. It's named AuthX because it's an "exchange" of sorts, consolidating identities from several upstream authorities into a single identity for downstream clients. AuthX uses the OAuth2 framework in both directions, and adds a robust access control system, based on the [AuthX scope spec](../scopes).

---

[Concepts](#concepts) | [Development](#development) | [Scopes](#scopes)

---

## Concepts

AuthX is designed for a scenario in which a **RESOURCE** needs to restrict access to all or part of its functionality. A **CLIENT** app, acting on behalf of a **User** can retreive an OAuth token from AuthX, which can be passed to the **RESOURCE** with any request.

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

A user is the central component, and represents a source of agency, either `human` or `machine`.

### Resource

A resource is anything which requires an AuthX token to perform an action.

### Client

A client uses AuthX to act on behalf of a user.

### Grant

A grant contains the set of scopes for which a client's can act on a user's behalf.

### Authorization

An authorization contains the set of scopes that will be encoded in a token and passed to a resource by a client.

### Role

A role bestows its scopes to every user it includes.

### Authority

An authority is a mechanism for authentication, and provides the configuration for corresponding units of code called _strategies_. Several strategies are included by default:

1. **email** - use an email address to verify a visitor's identity (most people call this "reset your password")
2. **password** - verify your identity with a password (which is protected with bcrypt)
3. **openid** - connect to an OpenID provider, such as Google

### Credential

Credentials connect users to authorities. A user can have multiple credentials of the some authorities (multiple emails, for example), or be limited to one (such as a password).

## Development

### Scripts

These scripts can be run using `npm run <script>` or `yarn <script>`; when relevant, the following environment variables can be set to modify their behavior:

- `PORT`: HTTP port to listen
- `PGHOST`: postgres host
- `PGPORT`: postgres port
- `PGUSER`: postgres user
- `PGPASSWORD`: postgres password

#### `format`

Use prettier to format the code in this package.

#### `lint`

Check the contents of this package against prettier and eslint rules.

#### `prepare`

Build the files from `/src` to the `/dist` directory with optimizations.

#### `prepare:development`

Build the files from `/src` to the `/dist` directory, and re-build as changes are made to source files.

#### `start`

Start a web server that runs AuthX.

#### `start:development`

Start a web server that runs AuthX and reloads as its source files change. Use the `PORT` environment variable to specify a port.

#### `test`

Run all tests from the `/dist` directory.

#### `test:development`

Run all tests from the `/dist` directory, and re-run a test when it changes.

### Files

#### [/src](src/)

This holds the source code for AuthX.

#### [/dist](dist/)

The compiled and bundled code ends up here for distribution. This is ignored by git.

## Scopes

AuthX uses its own authorization system to restrict access to its resources. Below are the scopes used by AuthX internally:

| Realm   | Context(.identifier)      |  Action |
|----------|-------------|------|
| authx | authority | read. {      details} |
| authx | authority | write.{basic&#124;details&#124;*} |

| Realm   | Context(.identifier)      |  Action |
|----------|-------------|------|
| authx | client.{assigned&#124;*} | read.{basic&#124;secrets&#124;assignments} |
| authx | client.{assigned&#124;*} | write.{basic&#124;secrets&#124;assignments&#124;*} |

| Realm   | Context(.identifier)      |  Action |
|----------|-------------|------|
| authx | credential.equal.self   | read .{basic&#124;details} |
| authx | credential.equal.lesser | read .{basic&#124;details} |
| authx | credential.equal.*      | read .{basic&#124;details} |
| authx | credential.*    .*      | read .{basic&#124;details} |
| authx | credential.equal.self   | write.{basic&#124;details&#124;*} |
| authx | credential.equal.lesser | write.{basic&#124;details&#124;*} |
| authx | credential.equal.*      | write.{basic&#124;details&#124;*} |
| authx | credential.*    .*      | write.{basic&#124;details&#124;*} |

| Realm   | Context(.identifier)      |  Action |
|----------|-------------|------|
| authx | role.equal.assigned | read .{basic&#124;scopes&#124;assignments} |
| authx | role.equal.lesser   | read .{basic&#124;scopes&#124;assignments} |
| authx | role.equal.*        | read .{basic&#124;scopes&#124;assignments} |
| authx | role.*    .*        | read .{basic&#124;scopes&#124;assignments} |
| authx | role.equal.assigned | write.{basic&#124;scopes&#124;assignments&#124;*} |
| authx | role.equal.lesser   | write.{basic&#124;scopes&#124;assignments&#124;*} |
| authx | role.equal.*        | write.{basic&#124;scopes&#124;assignments&#124;*} |
| authx | role.*    .*        | write.{basic&#124;scopes&#124;assignments&#124;*} |

| Realm   | Context(.identifier)      |  Action |
|----------|-------------|------|
| authx | grant.assigned             | read .{basic&#124;scopes&#124;secrets} |
| authx | grant.equal.self  .current | read .{basic&#124;scopes&#124;secrets} |
| authx | grant.equal.self  .granted | read .{basic&#124;scopes&#124;secrets} |
| authx | grant.equal.self  .*       | read .{basic&#124;scopes&#124;secrets} |
| authx | grant.equal.lesser.*       | read .{basic&#124;scopes&#124;secrets} |
| authx | grant.equal.*     .*       | read .{basic&#124;scopes&#124;secrets} |
| authx | grant.*    .*     .*       | read .{basic&#124;scopes&#124;secrets} |
| authx | grant.equal.self  .current | write.{basic&#124;scopes&#124;secrets&#124;*} |
| authx | grant.equal.self  .granted | write.{basic&#124;scopes&#124;secrets&#124;*} |
| authx | grant.equal.self  .*       | write.{basic&#124;scopes&#124;secrets&#124;*} |
| authx | grant.equal.lesser.*       | write.{basic&#124;scopes&#124;secrets&#124;*} |
| authx | grant.equal.*     .*       | write.{basic&#124;scopes&#124;secrets&#124;*} |
| authx | grant.*    .*     .*       | write.{basic&#124;scopes&#124;secrets&#124;*} |

| Realm   | Context(.identifier)      |  Action |
|----------|-------------|------|
| authx | authorization.assigned             | read .{basic&#124;scopes&#124;secrets} |
| authx | authorization.equal.self  .current | read .{basic&#124;scopes&#124;secrets} |
| authx | authorization.equal.self  .granted | read .{basic&#124;scopes&#124;secrets} |
| authx | authorization.equal.self  .*       | read .{basic&#124;scopes&#124;secrets} |
| authx | authorization.equal.lesser.*       | read .{basic&#124;scopes&#124;secrets} |
| authx | authorization.equal.*     .*       | read .{basic&#124;scopes&#124;secrets} |
| authx | authorization.*    .*     .*       | read .{basic&#124;scopes&#124;secrets} |
| authx | authorization.equal.self  .current | write.{basic&#124;scopes} |
| authx | authorization.equal.self  .granted | write.{basic&#124;scopes&#124;*} |
| authx | authorization.equal.self  .*       | write.{basic&#124;scopes&#124;*} |
| authx | authorization.equal.lesser.*       | write.{basic&#124;scopes&#124;*} |
| authx | authorization.equal.*     .*       | write.{basic&#124;scopes&#124;*} |
| authx | authorization.*    .*     .*       | write.{basic&#124;scopes&#124;*} |

| Realm   | Context(.identifier)      |  Action |
|----------|-------------|------|
| authx | user.equal.self   | read.{basic} |
| authx | user.equal.lesser | read.{basic} |
| authx | user.equal.*      | read.{basic} |
| authx | user.*    .*      | read.{basic} |
| authx | user.equal.self   | write.{basic&#124;*} |
| authx | user.equal.lesser | write.{basic&#124;*} |
| authx | user.equal.*      | write.{basic&#124;*} |
| authx | user.*    .*      | write.{basic&#124;*} |

```
authx:authority:read. {      details}
authx:authority:write.{basic|details|*}

authx:client.{assigned|*}:read.{basic|secrets|assignments}
authx:client.{assigned|*}:write.{basic|secrets|assignments|*}

authx:credential.equal.self  :read .{basic|details}
authx:credential.equal.lesser:read .{basic|details}
authx:credential.equal.*     :read .{basic|details}
authx:credential.*    .*     :read .{basic|details}
authx:credential.equal.self  :write.{basic|details|*}
authx:credential.equal.lesser:write.{basic|details|*}
authx:credential.equal.*     :write.{basic|details|*}
authx:credential.*    .*     :write.{basic|details|*}

authx:role.equal.assigned:read .{basic|scopes|assignments}
authx:role.equal.lesser  :read .{basic|scopes|assignments}
authx:role.equal.*       :read .{basic|scopes|assignments}
authx:role.*    .*       :read .{basic|scopes|assignments}
authx:role.equal.assigned:write.{basic|scopes|assignments|*}
authx:role.equal.lesser  :write.{basic|scopes|assignments|*}
authx:role.equal.*       :write.{basic|scopes|assignments|*}
authx:role.*    .*       :write.{basic|scopes|assignments|*}

authx:grant.assigned            :read .{basic|scopes|secrets}
authx:grant.equal.self  .current:read .{basic|scopes|secrets}
authx:grant.equal.self  .granted:read .{basic|scopes|secrets}
authx:grant.equal.self  .*      :read .{basic|scopes|secrets}
authx:grant.equal.lesser.*      :read .{basic|scopes|secrets}
authx:grant.equal.*     .*      :read .{basic|scopes|secrets}
authx:grant.*    .*     .*      :read .{basic|scopes|secrets}
authx:grant.equal.self  .current:write.{basic|scopes|secrets|*}
authx:grant.equal.self  .granted:write.{basic|scopes|secrets|*}
authx:grant.equal.self  .*      :write.{basic|scopes|secrets|*}
authx:grant.equal.lesser.*      :write.{basic|scopes|secrets|*}
authx:grant.equal.*     .*      :write.{basic|scopes|secrets|*}
authx:grant.*    .*     .*      :write.{basic|scopes|secrets|*}

authx:authorization.assigned            :read .{basic|scopes|secrets}
authx:authorization.equal.self  .current:read .{basic|scopes|secrets}
authx:authorization.equal.self  .granted:read .{basic|scopes|secrets}
authx:authorization.equal.self  .*      :read .{basic|scopes|secrets}
authx:authorization.equal.lesser.*      :read .{basic|scopes|secrets}
authx:authorization.equal.*     .*      :read .{basic|scopes|secrets}
authx:authorization.*    .*     .*      :read .{basic|scopes|secrets}
authx:authorization.equal.self  .current:write.{basic|scopes}
authx:authorization.equal.self  .granted:write.{basic|scopes|*}
authx:authorization.equal.self  .*      :write.{basic|scopes|*}
authx:authorization.equal.lesser.*      :write.{basic|scopes|*}
authx:authorization.equal.*     .*      :write.{basic|scopes|*}
authx:authorization.*    .*     .*      :write.{basic|scopes|*}

authx:user.equal.self  :read.{basic}
authx:user.equal.lesser:read.{basic}
authx:user.equal.*     :read.{basic}
authx:user.*    .*     :read.{basic}
authx:user.equal.self  :write.{basic|*}
authx:user.equal.lesser:write.{basic|*}
authx:user.equal.*     :write.{basic|*}
authx:user.*    .*     :write.{basic|*}
```

Users must have the following scopes to use OAuth:

| Realm   | Context(.identifier)      |  Action |
|----------|-------------|------|
| authx | client.* | read.basic |
| authx | user.equal.self | read.basic |
| authx | grant.equal.self.* | read.basic |
| authx | grant.equal.self.* | read.scopes |
| authx | grant.equal.self.* | read.secrets |
| authx | grant.equal.self.* | write.* |
| authx | authorization.equal.self.* | read.basic |
| authx | authorization.equal.self.* | read.scopes |
| authx | authorization.equal.self.current | read.secrets |
| authx | authorization.equal.self.* | write.* |

```
authx:client.*:read.basic
authx:user.equal.self:read.basic
authx:grant.equal.self.*:read.basic
authx:grant.equal.self.*:read.scopes
authx:grant.equal.self.*:read.secrets
authx:grant.equal.self.*:write.*
authx:authorization.equal.self.*:read.basic
authx:authorization.equal.self.*:read.scopes
authx:authorization.equal.self.current:read.secrets
authx:authorization.equal.self.*:write.*
```

The following scopes must be granted for a client to take full advantage of OAuth:

| Realm   | Context(.identifier)      |  Action |
|----------|-------------|------|
| authx | grant.equal.self.granted | read.basic |
| authx | grant.equal.self.granted | read.scopes |
| authx | authorization.equal.self.granted | write.* |

```
authx:grant.equal.self.granted:read.basic
authx:grant.equal.self.granted:read.scopes
authx:authorization.equal.self.granted:write.*
```
