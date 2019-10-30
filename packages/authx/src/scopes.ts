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
        "authority.(authority_id)....": 'the authority with id "(authority_id)"'
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
        "authority.....": "a new authority",
        "authority.*....": "any new or existing authority"
      },
      {
        ...commonAuthorityActions,
        create: "create",
        "write.*": "write all fields for",
        "**": "read and write all fields for, or create"
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
        "client...(client_id)...": 'the client with id "(client_id)"'
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
        "client......": "a new client",
        "client...*...": "any new or existing client"
      },
      {
        ...commonClientActions,
        create: "create",
        "write.*": "write all fields for",
        "**": "read and write all fields for, or create"
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
        "role.....(role_id).": 'the role with id "(role_id)"'
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
        "role......": "a new role",
        "role.....*.": "any new or existing role"
      },
      {
        ...commonRoleActions,
        create: "create",
        "write.*": "write all fields for",
        "**": "read and write all fields for, or create"
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
        "user......(user_id)": 'the user with id "(user_id)"',
        "user......{current_user_id}": "the current user"
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
        "user......": "a new user",
        "user......*": "any new or existing user"
      },
      {
        ...commonUserActions,
        create: "create",
        "write.*": "write all fields for",
        "**": "read and write all fields for, or create"
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
        "credential.(authority_id)...(credential_id)..(user_id)":
          'the credential with id "(credential_id)"',

        "credential.(authority_id)...*..(user_id)":
          'any new or existing credential belonging to both the user with id "(user_id)" and authority with id "(authority_id)"',
        "credential.(authority_id)...*..{current_user_id}":
          'any new or existing credential belonging to both the current user and authority with id "(authority_id)"',
        "credential.*...*..(user_id)":
          'any new or existing credential belonging to the user with id "(user_id)"',
        "credential.*...*..{current_user}":
          "any new or existing credential belonging to the current user",
        "credential.(authority_id)...*..*":
          'any new or existing credential belonging to the authority with id "(authority_id)"',

        "credential.*...*..*": "any new or existing credential"
      },
      {
        "read.basic": "read the basic fields of",
        "read.details": "read potentially sensitive details of",
        "read.*": "read all fields of",
        "write.basic": "write basic fields for",
        "write.details": "write potentially sensitive details for",
        create: "create",
        "write.*": "write all fields for",
        "**": "read and write all fields for, or create"
      }
    ]
  ];

  const grant: [
    PatternDescriptionMap,
    PatternDescriptionMap,
    PatternDescriptionMap
  ][] = [
    // Grant
    [
      realm,
      {
        "grant...(client_id)...(user_id)":
          'any new or existing grant belonging to both the user with id "(user_id)" and the client with id "(client_id)"',
        "grant...{current_client_id}...{current_user_id}":
          "any new or existing grant belonging to both the current user and the current client",
        "grant...(client_id)...{current_user_id}":
          'any new or existing grant belonging to both the current user and the client with id "(client_id)"',
        "grant...{current_client_id}...(user_id)":
          'any new or existing grant belonging to both the user with id "(user_id)" and the current client',

        "grant...*...(user_id)":
          'any new or existing grant belonging to the user with id "(user_id)"',
        "grant...*...{current_user_id}":
          "any new or existing grant belonging to the current user",
        "grant...(client_id)...*":
          'any new or existing grant belonging to the client with id "(client_id)"',
        "grant...{current_client_id}...*":
          "any new or existing grant belonging to the current client",

        "grant...*...*": "any new or existing grant"
      },
      {
        "read.basic": "read the basic fields of",
        "read.scopes": "read the scopes of",
        "read.secrets": "read the secrets of",
        "read.*": "read all fields of",
        "write.basic": "write basic fields for",
        "write.scopes": "add and remove scopes for",
        "write.secrets": "write secrets for",
        create: "create",
        "write.*": "write all fields for",
        "**": "read and write all fields for, or create"
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
        "authorization..(authorization_id).(client_id)...(user_id)":
          'the authorization with id "(authorization_id)',
        "authorization..{current_authorization_id}.(client_id)...{current_user_id}":
          "the current authorization",

        "authorization..*.(client_id)...(user_id)":
          'any new or existing authorization belonging to both the user with id "(user_id)" and the client with id "(client_id)"',
        "authorization..*.{current_client_id}...{current_user_id}":
          "any new or existing authorization belonging to both the current user and the current client",
        "authorization..*.{current_client_id}...(user_id)":
          'any new or existing authorization belonging to both the user with id "(user_id)" and the current client',
        "authorization..*.(client_id)...{current_user_id}":
          'any new or existing authorization belonging to both the current user and the client with id "(client_id)"',

        "authorization..*.(client_id)...*":
          'any new or existing authorization belonging to the client with id "(client_id)"',
        "authorization..*.{current_client_id}...*":
          "any new or existing authorization belonging to the current client",

        "authorization..*.*...(user_id)":
          'any new or existing authorization belonging to the user with id "(user_id)"',
        "authorization..*.*...{current_user_id}":
          "any new or existing authorization belonging to the current user",

        "authorization..*.*...*": "any new or existing authorization"
      },
      {
        "read.basic": "read the basic fields of",
        "read.scopes": "read the scopes of",
        "read.secrets": "read the secrets of",
        "write.basic": "write basic fields for",
        create: "create",
        "write.*": "write all fields for",
        "**": "read and write all fields for, or create"
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
