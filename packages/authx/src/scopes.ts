export default (
  realm: { [scope: string]: string } = {
    "authx.production": "The production AuthX instance."
  }
) => [
  [
    realm,
    {
      authority: "All authorities."
    },
    {
      "read.basic": "Read basic authority information.",
      "read.*": "Read all authority information.",
      "write.basic": "Write basic authority information.",
      "write.*": "Write or create authorities."
    }
  ],
  [
    realm,
    {
      "client.assigned": "Clients to which {you} are assigned.",
      "client.*": "All clients."
    },
    {
      "read.basic": "Read basic clitnt information.",
      "read.secrets": "Read the client secrets.",
      "read.assignments": "Read the list of users assigned to the client.",
      "write.basic": "Write basic client information.",
      "write.secrets": "Write the client secrets.",
      "write.assignments": "Write the list of users assigned to the client.",
      "write.*": "Write or create client."
    }
  ],
  [
    realm,
    {
      "credential.equal.self": "Credentials {you} own..",
      "credential.equal.lesser":
        "Credentials of users with less access than {you}.",
      "credential.equal.*":
        "Credentials of users with the same or less access than {you}.",
      "credential.*.*": "Credentials of all users."
    },
    {
      "read.basic": "Read basic credential information.",
      "read.*": "Read all credential information.",
      "write.basic": "Write basic credential information.",
      "write.*": "Write or create credentials."
    }
  ],
  [
    realm,
    {
      "role.equal.assigned": "Roles to which {you} are assigned.",
      "role.equal.lesser": "Roles with less access than {you}.",
      "role.equal.*": "Roles with the same or less access than {you}.",
      "role.*.*": "All roles."
    },
    {
      "read.basic": "Read basic role information.",
      "read.scopes": "Read the role scopes.",
      "read.assignments": "Read the list of users assigned to the role."
    }
  ],
  [
    realm,
    {
      "role.equal.lesser": "Roles with less access than {you}.",
      "role.equal.*": "Roles with the same or less access than {you}.",
      "role.*.*": "All roles."
    },
    {
      "write.basic": "Write basic role information.",
      "write.scopes": "Write the role scopes.",
      "write.assignments": "Write the list of users assigned to the role.",
      "write.*": "Write or create roles."
    }
  ],
  [
    realm,
    {
      "grant.assigned": "Grants for clients to which {you} are assigned."
    },
    {
      "read.basic": "Read basic grant information.",
      "read.scopes": "Read the grant scopes.",
      "read.secrets": "Read the grant secrets."
    }
  ],
  [
    realm,
    {
      "grant.equal.self.granted":
        "Grants {you} own which are the parent of the acting authorization.",
      "grant.equal.self.*": "Grants {you} own.",
      "grant.equal.lesser.*": "Grants of users with less access than {you}.",
      "grant.equal.*.*":
        "Grants of users with the same or less access than {you}.",
      "grant.*.*.*": "Grants of all users."
    },
    {
      "read.basic": "Read basic grant information.",
      "read.scopes": "Read the grant scopes.",
      "read.secrets": "Read the grant secrets.",
      "write.basic": "Write basic grant information.",
      "write.scopes": "Write the grant scopes.",
      "write.secrets": "Write the grant secrets.",
      "write.*": "Write or create grants."
    }
  ],
  [
    realm,
    {
      "authorization.assigned":
        "Authorizations for clients to which {you} are assigned."
    },
    {
      "read.basic": "Read basic authorization information.",
      "read.scopes": "Read the authorization scopes.",
      "read.secrets": "Read the authorization secrets."
    }
  ],
  [
    realm,
    {
      "authorization.equal.self.current":
        "Authorizations {you} own which are the same as the acting authorization.",
      "authorization.equal.self.granted":
        "Authorizations {you} own which share a grant with the acting authorization.",
      "authorization.equal.self.*": "Authorizations {you} own.",
      "authorization.equal.lesser.*":
        "Authorizations of users with less access than {you}.",
      "authorization.equal.*.*":
        "Authorizations of users with the same or less access than {you}.",
      "authorization.*.*.*": "Authorizations of all users."
    },
    {
      "read.basic": "Read basic authorization information.",
      "read.scopes": "Read the authorization scopes.",
      "read.secrets": "Read the authorization secrets.",
      "write.basic": "Write basic authorization information.",
      "write.scopes": "Write the authorization scopes.",
      "write.secrets": "Write the authorization secrets.",
      "write.*": "Write or create authorizations."
    }
  ],
  [
    realm,
    {
      "user.equal.self": "{you}",
      "user.equal.lesser": "Users with less access than {you}.",
      "user.equal.*": "Users with the same or less access than {you}.",
      "user.*.*": "All users."
    },
    {
      "read.basic": "Read basic user information.",
      "write.basic": "Write basic user information.",
      "write.*": "Write or create users."
    }
  ]
];
