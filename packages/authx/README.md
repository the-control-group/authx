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

AuthX uses its own authorization system to restrict access to its resources. A scope is divided into three parts:

1. **realm**: this is configurable to the individual instance (for example, `authx` or `identity` or `authx.dev`)
2. **context**: this contains the criteria required for an action to be valid
3. **action**: the action being performed

### Context

For an AuthX resource, the **context** is always in the following format:

```
v2.(entity_type).(authority_id).(authorization_id).(client_id).(credential_id).(role_id).(user_id)
```

When checking for the ability to perform an action on an entity, the entity's ID and the IDs of related entities are present on the compared scope. When creating a _new_ entity, only the IDs of related entities will be present, and the position of the entity' ID will be empty, even if an ID is specified for the entity in its creation request.

Given an entity type, relevant IDs will be present in the context:

| `entity_type`   | `authority_id` | `authorization_id` | `client_id` | `credential_id` | `grant_id` | `role_id` | `user_id` |
| --------------- | :------------: | :----------------: | :---------: | :-------------: | :--------: | :-------: | :-------: |
| `authority`     |       ✪        |                    |             |                 |            |           |           |
| `authorization` |                |         ✪          |      ●      |                 |     ○      |           |     ●     |
| `client`        |                |                    |      ✪      |                 |            |           |           |
| `credential`    |       ●        |                    |             |        ✪        |            |           |     ●     |
| `grant`         |                |                    |      ●      |                 |     ✪      |           |     ●     |
| `role`          |                |                    |             |                 |            |     ✪     |           |
| `user`          |                |                    |             |                 |            |           |     ✪     |

- ○ An ID may be present.
- ● An ID will always be present for an action.
- ✪ An ID will be present for existing entities, and will be empty for a _new_ entity.

### Action

For an AuthX resource, the **action** is always in the following format:

```
(basic).(details).(scopes).(secrets).(users)
```

In each position, an `r` designates the ability to perform reads, a `w` designates the ability to write, and (per normmal scope semantics) a `*` designates both.

To _create_ a new entity, a value of `*` is required in each relevant position. For example, the following scope represents the ability to create a new client:

```
authx:v2.client.......:*..*.*.
```

| `entity_type`   | `basic` | `details` | `scopes` | `secrets` | `users` |
| --------------- | :-----: | :-------: | :------: | :-------: | :-----: |
| `authority`     |    ✪    |     ●     |          |           |         |
| `authorization` |    ✪    |           |    ●     |     ●     |         |
| `client`        |    ✪    |           |          |     ●     |         |
| `credential`    |    ✪    |     ●     |          |           |         |
| `grant`         |    ✪    |           |    ●     |     ●     |         |
| `role`          |    ✪    |           |    ●     |           |    ●    |
| `user`          |    ✪    |           |    ●     |           |         |

- ● An `r` will be checked for reads; a `w` will be checked for writes.
- ✪ All other applicable positions will check for a corresponding `r` or `w` in this position.

## OAuth

Users must have the following scopes to use OAuth:

```
authx:v2.client...*....:r....
authx:v2.user.......{current_user_id}:r....
authx:v2.grant...{current_client_id}..{current_grant_id}..{current_user_id}:*..*.*.
authx:v2.authorization..*.{current_client_id}..{current_grant_id}..{current_user_id}:*..*.*.
```

The following scopes are implicit in an OAuth request:

```
authx:v2.authorization..*.{current_client_id}..{current_grant_id}..{current_user_id}:*..*.*.
```

## Scope Explanations

