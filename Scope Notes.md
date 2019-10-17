Conditions to watch out for:

- a user who has `write.scopes` on a role to which they are not assigned, and any scopes for a user other than self
- or `write.users` on any role to which they are not assigned

## Flows

### Creating a new client

```graphql
input type AdministrationRoleInput {
  id: ID
  userIds: [ID!]
}
```

- has optional arg `createAdministrationRole: Boolean`
- has optional arg `administrationRole: AdministrationRoleInput`
- creates a client "X" (id: xxx)
- creates a role "Client X Admin" (id: yyy)
  - only if user can authx:role.new:write.\*
  - scopes:
    - authx:client.xxx:\*\*
    - authx:client.xxx.grant:\*\*
    - authx:client.xxx.authorization:\*\*
    - authx:role.yyy:\*\*

--- OR ---

has field `administrationRoleId: ID`, which can specify:

- an _existing_ role ID (checks authx:role&lt;id&gt;:write.scope)
- a _new_ role ID (checks authx:role.new:write.\*)

### A developer creating a new ICM user for testing

The API has preconfigured:

- role ID to which "test" account scopes are added
-

1. The API verifies that the user's credentials provide access to this tool
2. The API uses its own credentials to create the necessary entities
3. The API uses its own credentials to update the role with the scopes necessary for accessing the creted entities

---

When setting role.scope, a user can only add scopes that come from roles to which they can `write.member`. This prevents a user from creating a new role that contains permissions obtained from the initial one, and then adding members.

---

What about creating an "administration role" for each user?

---

How do I balance dynamic vs static scopes...

1. We create a user account...
2. The user only has access through "Employee" to her own credentials via dynamic scopes (`user.current`)
3. The user wants to give another user access to her credentials for some reason?

Perhaps this isn't an issue?

---

We want ICD managers to be able to update the credentials of their team members...

- Currently, this syncs over from OneLogin

  - The SCIM server can use the `administrationRoleId` feature to give itself access to the entities it creates, removing the need for `authx:**:**`

- This should be possible directly within AuthX
  - give this permission with the `user.peer.**` dynamic scopes
  - use symbolic scopes to separate teams

...how does this work with overlapping scopes? For example a user has `user.xxx:read.basic`, the other has `user.xxx:read.current` (and current user ID is xxx): these are distinct scopes... and this is why it's important for the ROLE to map to external IDs (as opposed to external systems mapping to AuthX user IDs). For example:

- somerealm:records.mine:update

---

Why is AuthX special? Can we reduce or remove dynamic scopes?

Why do we have dynamic scopes at all?

- So that a client can request access for things like "the current user" before knowing the ID of the current user
  - Could we use wildcards here? Yes, and then the user could limit access... but we would be over-requesting.
  - Can we have implied, alias, or template oauth scopes?
    - grant.{grant}:read.\*
    - grant.{authorization}.authorization:\*\*
- So that it's easier to create roles like "basic employee" with scopes `user.current:**`
  - Could we create a new administration role with static scopes per user? Yes...
    - How would we revoke these in bulk?
      - We could make {dynamic} part of the scope spec, but ONLY denoting something that is resolvable by AuthX...
        - Do we have any other use-cases for this?
          - It could maybe allow mapping to happen in other systems... which may or may not be desired
- To prevent auth headers from becoming massive
  - Can we work around this with scope templates? Scope compaction? (jwt gzip?)

(These dynamic scopes are relative to the the current authorization... or the current user...)

- user.current
- grant.current
- authorization.current

---

write.\* vs write.create

### write.create

- separate creation and future editing

### write.\*

-

---

### "Basic User" Role

- authx:user.{current_user}:\*\*
- authx:user.{current_user}.authorization:\*\*
- authx:user.{current_user}.credential:\*\*
- authx:user.{current_user}.grant:\*\*

### Implicit OAuth Scopes

- authx:grant.{current_grant}:read.\*
- authx:grant.{current_grant}.authorization:\*\*

An injected segment can exist:

- in a role's scopes
- in an OAuth request
