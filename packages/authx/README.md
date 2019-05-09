This is AuthX. It's named AuthX because it's an "exchange" of sorts, consolidating identities from several upstream authorities into a single identity for downstream clients. AuthX uses the OAuth2 framework in both directions, and adds a robust access control system, based on the [AuthX scope spec](../scopes).

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

- `PGHOST`: postgres host
- `PGPORT`: postgres port
- `PGUSER`: postgres user
- `PGPASSWORD`: postgres password
- `PORT`: HTTP port to listen

#### `yarn bootstrap`

Bootstrap a database by creating an initial root user and admin role, returning the user ID and password as JSON. Use the above environment variables to configure the postgres connection.

Pass the `--schema` argument to also create the database schema.

#### `yarn fixture`

Add test fixtures to the database. Use the above environment variables to configure the postgres connection.

Pass the `--schema` argument to also create the database schema.

#### `yarn format`

Use prettier to format the code in this package.

#### `yarn lint`

Check the contents of this package against prettier and eslint rules.

#### `yarn prepare`

Build the files from `/src` to the `/dist` directory with optimizations.

#### `yarn prepare:development`

Build the files from `/src` to the `/dist` directory, and re-build as changes are made to source files.

#### `yarn start`

Start a web server that runs AuthX.

#### `yarn start:development`

Start a web server that runs AuthX and reloads as its source files change. Use the `PORT` environment variable to specify a port.

#### `yarn test`

Run all tests from the `/dist` directory.

#### `yarn test:development`

Run all tests from the `/dist` directory, and re-run a test when it changes.

### Files

#### `/src`

This holds the source code for AuthX.

#### `/dist`

The compiled and bundled code ends up here for distribution. This is ignored by git.

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
AuthX:authorization.equal.self.*:read.basic
AuthX:authorization.equal.self.*:read.scopes
AuthX:authorization.equal.self.*:read.secrets
AuthX:authorization.equal.self.*:write.*
```

The following scopes must be granted for a client to take full advantage of OAuth:

```
AuthX:grant.equal.self.granted:read.basic
AuthX:grant.equal.self.granted:read.scopes
AuthX:authorization.equal.self.granted:write.*
```
