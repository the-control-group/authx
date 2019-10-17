import { PatternDescriptionMap } from "./util/humanizeScopes";

export default (
  realm: PatternDescriptionMap = {
    authx: "authx"
  }
): [PatternDescriptionMap, PatternDescriptionMap, PatternDescriptionMap][] => {
  // Authority
  const commonAuthorityActions = {
    "read.basic": "read the basic fields of",
    "read.details": "read potentially sensitive details of",
    "read.*": "read all fields of",
    "write.basic": "write basic fields for",
    "write.details": "write potentially sensitive details for"
  };

  const authority: [
    PatternDescriptionMap,
    PatternDescriptionMap,
    PatternDescriptionMap
  ][] = [
    [
      realm,
      {
        "authority.(id)": 'the authority with id "(id)"'
      },
      {
        ...commonAuthorityActions,
        "write.*": "write all fields for",
        "*.*": "read and write all fields for"
      }
    ],
    [
      realm,
      {
        "authority.": "a new authority",
        "authority.*": "any new or existing authority"
      },
      {
        ...commonAuthorityActions,
        "write.create": "create",
        "write.*": "write all fields for, or create",
        "*.*": "read and write all fields for, or create"
      }
    ]
  ];

  // Client
  const commonClientActions = {
    "read.basic": "read the basic fields of",
    "read.secrets": "read the secrets of",
    "read.*": "read all fields of",
    "write.basic": "write basic fields for",
    "write.secrets": "write secrets for"
  };

  const client: [
    PatternDescriptionMap,
    PatternDescriptionMap,
    PatternDescriptionMap
  ][] = [
    [
      realm,
      {
        "client.(id)": 'the client with id "(id)"'
      },
      {
        ...commonClientActions,
        "write.*": "write all fields for",
        "*.*": "read and write all fields for"
      }
    ],
    [
      realm,
      {
        "client.": "a new client",
        "client.*": "any new or existing client"
      },
      {
        ...commonClientActions,
        "write.create": "create",
        "write.*": "write all fields for, or create",
        "*.*": "read and write all fields for, or create"
      }
    ]
  ];

  // Role
  const commonRoleActions = {
    "read.basic": "read the basic fields of",
    "read.scopes": "read the scopes of",
    "read.users": "read the list of users assigned to",
    "read.*": "read all fields of",
    "write.basic": "write basic fields for",
    "write.scopes": "add and remove scopes for",
    "write.users": "assign and unassign users for"
  };

  const role: [
    PatternDescriptionMap,
    PatternDescriptionMap,
    PatternDescriptionMap
  ][] = [
    [
      realm,
      {
        "role.(id)": 'the role with id "(id)"'
      },
      {
        ...commonRoleActions,
        "write.*": "write all fields for",
        "*.*": "read and write all fields for"
      }
    ],
    [
      realm,
      {
        "role.": "a new role",
        "role.*": "any new or existing role"
      },
      {
        ...commonRoleActions,
        "write.create": "create",
        "write.*": "write all fields for, or create",
        "*.*": "read and write all fields for, or create"
      }
    ]
  ];

  // User
  const commonUserActions = {
    "read.basic": "read the basic fields of",
    "write.basic": "write the basic fields of"
  };

  const user: [
    PatternDescriptionMap,
    PatternDescriptionMap,
    PatternDescriptionMap
  ][] = [
    [
      realm,
      {
        "user.(id)": 'the user with id "(id)"',
        "user.{current_user_id}": "the current user"
      },
      {
        ...commonUserActions,
        "write.*": "write all fields for",
        "*.*": "read and write all fields for"
      }
    ],
    [
      realm,
      {
        "user.": "a new user",
        "user.*": "any new or existing user"
      },
      {
        ...commonUserActions,
        "write.create": "create",
        "write.*": "write all fields for, or create",
        "*.*": "read and write all fields for, or create"
      }
    ]
  ];

  // Credential
  const credential: [
    PatternDescriptionMap,
    PatternDescriptionMap,
    PatternDescriptionMap
  ][] = [
    [
      realm,
      {
        "credential.(id)": 'the credential with id "(id)"',
        "credential.*": "any new or existing credential",

        "user.(id).credentials":
          'credentials belonging to the user with id "(id)"',
        "user.{current_user_id}.credentials":
          "credentials belonging to the current user",

        "authority.(id).credentials":
          'credentials belonging to the authority with id "(id)"'
      },
      {
        "read.basic": "read the basic fields of",
        "read.details": "read potentially sensitive details of",
        "read.*": "read all fields of",
        "write.basic": "write basic fields for",
        "write.details": "write potentially sensitive details for",
        "write.create": "create",
        "write.*": "write all fields for, or create",
        "*.*": "read and write all fields for, or create"
      }
    ]
  ];

  const commonGrantActions = {
    "read.basic": "read the basic fields of",
    "read.scopes": "read the scopes of",
    "read.secrets": "read the secrets of",
    "read.*": "read all fields of"
  };

  const grant: [
    PatternDescriptionMap,
    PatternDescriptionMap,
    PatternDescriptionMap
  ][] = [
    // Grant
    [
      realm,
      {
        "grant.(id)": 'the grant with id "(id)"',
        "grant.{current_grant_id}": "the current grant",
        "grant.*": "any new or existing grant",

        "user.(id).grants": 'grants belonging to the user with id "(id)"',
        "user.{current_user_id}.grants": "grants belonging to the current user"
      },
      {
        ...commonGrantActions,
        "write.basic": "write basic fields for",
        "write.scopes": "add and remove scopes for",
        "write.secrets": "write secrets for",
        "write.create": "create",
        "write.*": "write all fields for, or create",
        "*.*": "read and write all fields for, or create"
      }
    ],
    [
      realm,
      {
        "client.(id).grants": 'grants associated with the client with id "(id)"'
      },
      {
        ...commonGrantActions
      }
    ]
  ];

  // Authorization
  const authorization: [
    PatternDescriptionMap,
    PatternDescriptionMap,
    PatternDescriptionMap
  ][] = [
    [
      realm,
      {
        "authorization.(id)": 'the authorization with id "(id)"',
        "authorization.{current_authorization_id}": "the current authorization",
        "authorization.*": "any new or existing authorization",

        "user.(id).authorizations":
          'authorizations belonging to the user with id "(id)"',
        "user.{current_user_id}.authorization":
          "authorizations belonging to the current user",

        "grant.(id).authorizations":
          "authorizations belonging to the same grant as {authorization}",
        "grant.{current_grant_id}.authorization":
          "authorizations belonging to the current grant",

        "client.(id).authorizations":
          'authorizations associated with the client with id "(id)"'
      },
      {
        "read.basic": "read the basic fields of",
        "read.scopes": "read the scopes of",
        "read.secrets": "read the secrets of",
        "write.basic": "write basic fields for",
        "write.create": "create",
        "write.*": "write all fields for, or create",
        "*.*": "read and write all fields for, or create"
      }
    ]
  ];

  return [
    ...authority,
    ...client,
    ...role,
    ...user,
    ...credential,
    ...grant,
    ...authorization
  ];
};
