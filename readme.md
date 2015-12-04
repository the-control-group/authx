[![wercker status](https://app.wercker.com/status/7897a00c300dc0dcbdd952ebab50dc35/s/master "wercker status")](https://app.wercker.com/project/bykey/7897a00c300dc0dcbdd952ebab50dc35)

This is the TCG auth service. It's named AuthX because it's an "exchange" of sorts, consolidating upstream identities from several authorities into a single identity for downstream clients. AuthX uses the (kinda disgusting) OAuth2 framework in both directions, and adds an *authorization* layer. Authorizations are based on scopes.


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
