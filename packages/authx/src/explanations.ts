import {
  DomainDescriptionMap,
  generateExplanationTemplates,
  Explanation
} from "./util/explanations";

export function createAuthXExplanations(
  realm: DomainDescriptionMap = {
    authx: "authx"
  }
): ReadonlyArray<Explanation> {
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
    DomainDescriptionMap,
    DomainDescriptionMap,
    DomainDescriptionMap
  ][] = [
    [
      realm,
      {
        "v2.authority.(authority_id)......":
          'the authority with id "(authority_id)"'
      },
      commonAuthorityActions
    ],
    [
      realm,
      {
        "v2.authority.......": "a new authority",
        "v2.authority.*......": "any new or existing authority"
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
    DomainDescriptionMap,
    DomainDescriptionMap,
    DomainDescriptionMap
  ][] = [
    [
      realm,
      {
        "v2.client...(client_id)....": 'the client with id "(client_id)"',
        "v2.client...{current_client_id}....": "the current client"
      },
      commonClientActions
    ],
    [
      realm,
      {
        "v2.client.......": "a new client",
        "v2.client...*....": "any new or existing client"
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
    DomainDescriptionMap,
    DomainDescriptionMap,
    DomainDescriptionMap
  ][] = [
    [
      realm,
      {
        "v2.role......(role_id).": 'the role with id "(role_id)"'
      },
      commonRoleActions
    ],
    [
      realm,
      {
        "v2.role.......": "a new role",
        "v2.role......*.": "any new or existing role"
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
    DomainDescriptionMap,
    DomainDescriptionMap,
    DomainDescriptionMap
  ][] = [
    [
      realm,
      {
        "v2.user.......(user_id)": 'the user with id "(user_id)"',
        "v2.user.......{current_user_id}": "the current user"
      },
      commonUserActions
    ],
    [
      realm,
      {
        "v2.user.......": "a new user",
        "v2.user.......*": "any new or existing user"
      },
      {
        ...commonUserActions,
        "*....": "create, read and write basic fields of"
      }
    ]
  ];

  // Credential
  const credential: [
    DomainDescriptionMap,
    DomainDescriptionMap,
    DomainDescriptionMap
  ][] = [
    [
      realm,
      {
        "v2.credential.(authority_id)...(credential_id)...(user_id)":
          'the credential with id "(credential_id)"',

        "v2.credential.(authority_id)...*...(user_id)":
          'any new or existing credential belonging to both the user with id "(user_id)" and authority with id "(authority_id)"',
        "v2.credential.(authority_id)...*...{current_user_id}":
          'any new or existing credential belonging to both the current user and authority with id "(authority_id)"',
        "v2.credential.*...*...(user_id)":
          'any new or existing credential belonging to the user with id "(user_id)"',
        "v2.credential.*...*...{current_user_id}":
          "any new or existing credential belonging to the current user",
        "v2.credential.(authority_id)...*...*":
          'any new or existing credential belonging to the authority with id "(authority_id)"',

        "v2.credential.*...*...*": "any new or existing credential"
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
    DomainDescriptionMap,
    DomainDescriptionMap,
    DomainDescriptionMap
  ][] = [
    // Grant
    [
      realm,
      {
        "v2.grant...(client_id)..(grant_id)..(user_id)":
          'the grant with id "(grant_id)"',
        "v2.grant...{current_client_id}..{current_grant_id}..{current_user_id}":
          "the current grant",

        "v2.grant...(client_id)..*..(user_id)":
          'any new or existing grant belonging to both the user with id "(user_id)" and the client with id "(client_id)"',
        "v2.grant...{current_client_id}..*..{current_user_id}":
          "any new or existing grant belonging to both the current user and the current client",
        "v2.grant...(client_id)..*..{current_user_id}":
          'any new or existing grant belonging to both the current user and the client with id "(client_id)"',
        "v2.grant...{current_client_id}..*..(user_id)":
          'any new or existing grant belonging to both the user with id "(user_id)" and the current client',

        "v2.grant...*..*..(user_id)":
          'any new or existing grant belonging to the user with id "(user_id)"',
        "v2.grant...*..*..{current_user_id}":
          "any new or existing grant belonging to the current user",
        "v2.grant...(client_id)..*..*":
          'any new or existing grant belonging to the client with id "(client_id)"',
        "v2.grant...{current_client_id}..*..*":
          "any new or existing grant belonging to the current client",

        "v2.grant...*..*..*": "any new or existing grant"
      },
      {
        "r....": "read the basic fields of",
        "r..r..": "read scopes of",
        "r...r.": "read secrets of",
        "r..*.*.": "read all fields of",
        "w....": "write basic fields for",
        "w..w..": "write scopes for",
        "w...w.": "write secrets for",
        "w..*.*.": "write all fields for",
        "*..*.*.": "create, read and write all fields for"
      }
    ]
  ];

  // Authorization
  const authorization: [
    DomainDescriptionMap,
    DomainDescriptionMap,
    DomainDescriptionMap
  ][] = [
    [
      realm,
      {
        "v2.authorization..(authorization_id).(client_id)..(grant_id)..(user_id)":
          'the authorization with id "(authorization_id)',
        "v2.authorization..{current_authorization_id}.(client_id)..{current_grant_id}..{current_user_id}":
          "the current authorization",

        "v2.authorization..*.(client_id)..(grant_id)..(user_id)":
          'any new or existing authorization belonging to the grant with id "(grant_id)"',
        "v2.authorization..*.{current_client_id}..{current_grant_id}..{current_user_id}":
          "any new or existing authorization belonging to the current grant",

        "v2.authorization..*.(client_id)..*..(user_id)":
          'any new or existing authorization belonging to both the user with id "(user_id)" and the client with id "(client_id)"',
        "v2.authorization..*.{current_client_id}..*..{current_user_id}":
          "any new or existing authorization belonging to both the current user and the current client",
        "v2.authorization..*.{current_client_id}..*..(user_id)":
          'any new or existing authorization belonging to both the user with id "(user_id)" and the current client',
        "v2.authorization..*.(client_id)..*..{current_user_id}":
          'any new or existing authorization belonging to both the current user and the client with id "(client_id)"',

        "v2.authorization..*.(client_id)..*..*":
          'any new or existing authorization belonging to the client with id "(client_id)"',
        "v2.authorization..*.{current_client_id}..*..*":
          "any new or existing authorization belonging to the current client",

        "v2.authorization..*.*..*..(user_id)":
          'any new or existing authorization belonging to the user with id "(user_id)"',
        "v2.authorization..*.*..*..{current_user_id}":
          "any new or existing authorization belonging to the current user",

        "v2.authorization..*.*..*..*": "any new or existing authorization"
      },
      {
        "r....": "read the basic fields of",
        "r..r..": "read scopes of",
        "r...r.": "read secrets of",
        "r..*.*.": "read all fields of",
        "w....": "write basic fields for",
        "w..w..": "write scopes for",
        "w...w.": "write secrets for",
        "w..*.*.": "write all fields for",
        "*..*.*.": "create, read and write all fields for"
      }
    ]
  ];

  return generateExplanationTemplates([
    ...authority,
    ...client,
    ...role,
    ...user,
    ...credential,
    ...grant,
    ...authorization,
    [
      realm,
      { "v2.*.*.*.*.*.*.*.*": "any new or existing entity" },
      {
        "r....": "read the basic fields of",
        "r..r..": "read scopes of",
        "r....r": "read users of",
        "w....": "write basic fields for",
        "w..w..": "write scopes for",
        "w....w": "write users for",
        "r.r...": "read potentially sensitive details of",
        "w.w...": "write potentially sensitive details for",
        "r...r.": "read secrets of",
        "w...w.": "read secrets of",
        "r.*.*.*.*": "read all fields of",
        "w.*.*.*.*": "write all fields for",
        "*.*.*.*.*": "create, read, and write all fields for"
      }
    ]
  ]);
}
