import { PatternDescriptionMap } from "./util/humanizeScopes";

export default (
  realm: PatternDescriptionMap = {
    authx: "authx"
  }
): [PatternDescriptionMap, PatternDescriptionMap, PatternDescriptionMap][] => {
  // Authority
  const commonAuthorityActions = {
    "r....": "read the basic fields of",
    "r.r...": "read potentially sensitive details of",
    "r.*...": "read all fields of",
    "w....": "write basic fields for",
    "w.w...": "write potentially sensitive details for",
    "w.*...": "write all fields of",
    "*.*...": "read and write all fields of"
  };

  const authority: [
    PatternDescriptionMap,
    PatternDescriptionMap,
    PatternDescriptionMap
  ][] = [
    [
      realm,
      {
        "authority.(authority_id).....":
          'the authority with id "(authority_id)"'
      },
      commonAuthorityActions
    ],
    [
      realm,
      {
        "authority......": "a new authority",
        "authority.*.....": "any new or existing authority"
      },
      {
        ...commonAuthorityActions,
        "*.*...": "create, read and write all fields of"
      }
    ]
  ];

  // Client
  const commonClientActions = {
    "r....": "read the basic fields of",
    "r...r.": "read secrets of",
    "r...*.": "read all fields of",
    "w....": "write basic fields for",
    "w...w.": "write secrets for",
    "w...*.": "write all fields of",
    "*...*.": "read and write all fields of"
  };

  const client: [
    PatternDescriptionMap,
    PatternDescriptionMap,
    PatternDescriptionMap
  ][] = [
    [
      realm,
      {
        "client...(client_id)....": 'the client with id "(client_id)"'
      },
      commonClientActions
    ],
    [
      realm,
      {
        "client.......": "a new client",
        "client...*....": "any new or existing client"
      },
      {
        ...commonClientActions,
        "*...*.": "create, read and write all fields of"
      }
    ]
  ];

  // Role
  const commonRoleActions = {
    "r....": "read the basic fields of",
    "r..r..": "read scopes of",
    "r....r": "read users of",
    "r..*..*": "read all fields of",
    "w....": "write basic fields for",
    "w..w..": "write scopes for",
    "w....w": "write users for",
    "w..*..*": "write all fields of",
    "*..*..*": "read and write all fields of"
  };

  const role: [
    PatternDescriptionMap,
    PatternDescriptionMap,
    PatternDescriptionMap
  ][] = [
    [
      realm,
      {
        "role......(role_id).": 'the role with id "(role_id)"'
      },
      commonRoleActions
    ],
    [
      realm,
      {
        "role.......": "a new role",
        "role......*.": "any new or existing role"
      },
      {
        ...commonRoleActions,
        "*..*..*": "create, read and write all fields of"
      }
    ]
  ];

  // User
  const commonUserActions = {
    "r....": "read the basic fields of",
    "w....": "write basic fields for",
    "*....": "read and write basic fields of"
  };

  const user: [
    PatternDescriptionMap,
    PatternDescriptionMap,
    PatternDescriptionMap
  ][] = [
    [
      realm,
      {
        "user.......(user_id)": 'the user with id "(user_id)"',
        "user.......{current_user_id}": "the current user"
      },
      commonUserActions
    ],
    [
      realm,
      {
        "user.......": "a new user",
        "user.......*": "any new or existing user"
      },
      {
        ...commonUserActions,
        "*....": "create, read and write basic fields of"
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
        "credential.(authority_id)...(credential_id)...(user_id)":
          'the credential with id "(credential_id)"',

        "credential.(authority_id)...*...(user_id)":
          'any new or existing credential belonging to both the user with id "(user_id)" and authority with id "(authority_id)"',
        "credential.(authority_id)...*...{current_user_id}":
          'any new or existing credential belonging to both the current user and authority with id "(authority_id)"',
        "credential.*...*...(user_id)":
          'any new or existing credential belonging to the user with id "(user_id)"',
        "credential.*...*...{current_user}":
          "any new or existing credential belonging to the current user",
        "credential.(authority_id)...*...*":
          'any new or existing credential belonging to the authority with id "(authority_id)"',

        "credential.*...*...*": "any new or existing credential"
      },
      {
        "r....": "read the basic fields of",
        "r.r...": "read potentially sensitive details of",
        "r.*...": "read all fields of",
        "w....": "write basic fields for",
        "w.w...": "write potentially sensitive details for",
        "w.*...": "write all fields of",
        "*.*...": "create, read and write all fields of"
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
        "grant...(client_id)..(grant_id)..(user_id)":
          'the grant with id "(grant_id)"',
        "grant...{current_client_id}..{current_grant_id}..{current_user_id}":
          "the current grant",

        "grant...(client_id)..*..(user_id)":
          'any new or existing grant belonging to both the user with id "(user_id)" and the client with id "(client_id)"',
        "grant...{current_client_id}..*..{current_user_id}":
          "any new or existing grant belonging to both the current user and the current client",
        "grant...(client_id)..*..{current_user_id}":
          'any new or existing grant belonging to both the current user and the client with id "(client_id)"',
        "grant...{current_client_id}..*..(user_id)":
          'any new or existing grant belonging to both the user with id "(user_id)" and the current client',

        "grant...*..*..(user_id)":
          'any new or existing grant belonging to the user with id "(user_id)"',
        "grant...*..*..{current_user_id}":
          "any new or existing grant belonging to the current user",
        "grant...(client_id)..*..*":
          'any new or existing grant belonging to the client with id "(client_id)"',
        "grant...{current_client_id}..*..*":
          "any new or existing grant belonging to the current client",

        "grant...*..*..*": "any new or existing grant"
      },
      {
        "r....": "read the basic fields of",
        "r..r..": "read scopes of",
        "r...r.": "read secrets of",
        "r..*.*.": "read all fields of",
        "w....": "write basic fields for",
        "w..w..": "read scopes of",
        "w...w.": "read secrets of",
        "w..*.*.": "read all fields of",
        "*..*.*.": "create, read and write all fields of"
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
        "authorization..(authorization_id).(client_id)..(grant_id)..(user_id)":
          'the authorization with id "(authorization_id)',
        "authorization..{current_authorization_id}.(client_id)..{current_grant_id}..{current_user_id}":
          "the current authorization",

        "authorization..*.(client_id)..(grant_id)..(user_id)":
          'any new or existing authorization belonging to the grant with id "(grant_id)"',
        "authorization..*.{current_client_id}..{current_grant_id}..{current_user_id}":
          "any new or existing authorization belonging to the current grant",

        "authorization..*.(client_id)..*..(user_id)":
          'any new or existing authorization belonging to both the user with id "(user_id)" and the client with id "(client_id)"',
        "authorization..*.{current_client_id}..*..{current_user_id}":
          "any new or existing authorization belonging to both the current user and the current client",
        "authorization..*.{current_client_id}..*..(user_id)":
          'any new or existing authorization belonging to both the user with id "(user_id)" and the current client',
        "authorization..*.(client_id)..*..{current_user_id}":
          'any new or existing authorization belonging to both the current user and the client with id "(client_id)"',

        "authorization..*.(client_id)..*..*":
          'any new or existing authorization belonging to the client with id "(client_id)"',
        "authorization..*.{current_client_id}..*..*":
          "any new or existing authorization belonging to the current client",

        "authorization..*.*..*..(user_id)":
          'any new or existing authorization belonging to the user with id "(user_id)"',
        "authorization..*.*..*..{current_user_id}":
          "any new or existing authorization belonging to the current user",

        "authorization..*.*..*..*": "any new or existing authorization"
      },
      {
        "r....": "read the basic fields of",
        "r..r..": "read scopes of",
        "r...r.": "read secrets of",
        "r..*.*.": "read all fields of",
        "w....": "write basic fields for",
        "w..w..": "read scopes of",
        "w...w.": "read secrets of",
        "w..*.*.": "read all fields of",
        "*..*.*.": "create, read and write all fields of"
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
