import {
  DomainDescriptionMap,
  generate,
  Explanation,
} from "./util/explanations";

import {
  AuthorityAction,
  AuthorizationAction,
  ClientAction,
  CredentialAction,
  GrantAction,
  RoleAction,
  UserAction,
  AuthorityContext,
  AuthorizationContext,
  ClientContext,
  CredentialContext,
  GrantContext,
  RoleContext,
  UserContext,
  createV2AuthXScopeAction,
  createV2AuthXScopeContext,
} from "./util/scopes";

export function createAuthXExplanations(
  realm: DomainDescriptionMap = {
    authx: "authx",
  }
): ReadonlyArray<Explanation> {
  // Authority
  const commonAuthorityActions = {
    [createV2AuthXScopeAction({
      basic: "r",
      details: "",
    } as AuthorityAction)]: "read the basic fields of",
    [createV2AuthXScopeAction({
      basic: "r",
      details: "r",
    } as AuthorityAction)]: "read potentially sensitive details of",
    [createV2AuthXScopeAction({
      basic: "r",
      details: "*",
    } as AuthorityAction)]: "read all fields of",
    [createV2AuthXScopeAction({
      basic: "w",
      details: "",
    } as AuthorityAction)]: "write basic fields for",
    [createV2AuthXScopeAction({
      basic: "w",
      details: "w",
    } as AuthorityAction)]: "write potentially sensitive details for",
    [createV2AuthXScopeAction({
      basic: "w",
      details: "*",
    } as AuthorityAction)]: "write all fields of",
    [createV2AuthXScopeAction({
      basic: "*",
      details: "*",
    } as AuthorityAction)]: "read and write all fields of",
  };

  const authority: [
    DomainDescriptionMap,
    DomainDescriptionMap,
    DomainDescriptionMap
  ][] = [
    [
      realm,
      {
        [createV2AuthXScopeContext({
          type: "authority",
          authorityId: "(authority_id)",
        } as AuthorityContext)]: 'the authority with id "(authority_id)"',
      },
      commonAuthorityActions,
    ],
    [
      realm,
      {
        [createV2AuthXScopeContext({
          type: "authority",
          authorityId: "",
        } as AuthorityContext)]: "a new authority",
        [createV2AuthXScopeContext({
          type: "authority",
          authorityId: "*",
        } as AuthorityContext)]: "any new or existing authority",
      },
      {
        ...commonAuthorityActions,
        [createV2AuthXScopeAction({
          basic: "*",
          details: "*",
        } as AuthorityAction)]: "create, read and write all fields of",
      },
    ],
  ];

  // Client
  const commonClientActions = {
    [createV2AuthXScopeAction({
      basic: "r",
      secrets: "",
    } as ClientAction)]: "read the basic fields of",
    [createV2AuthXScopeAction({
      basic: "r",
      secrets: "r",
    } as ClientAction)]: "read secrets of",
    [createV2AuthXScopeAction({
      basic: "r",
      secrets: "*",
    } as ClientAction)]: "read all fields of",
    [createV2AuthXScopeAction({
      basic: "w",
      secrets: "",
    } as ClientAction)]: "write basic fields for",
    [createV2AuthXScopeAction({
      basic: "w",
      secrets: "w",
    } as ClientAction)]: "write secrets for",
    [createV2AuthXScopeAction({
      basic: "w",
      secrets: "*",
    } as ClientAction)]: "write all fields of",
    [createV2AuthXScopeAction({
      basic: "*",
      secrets: "*",
    } as ClientAction)]: "read and write all fields of",
  };

  const client: [
    DomainDescriptionMap,
    DomainDescriptionMap,
    DomainDescriptionMap
  ][] = [
    [
      realm,
      {
        [createV2AuthXScopeContext({
          type: "client",
          clientId: "(client_id)",
        } as ClientContext)]: 'the client with id "(client_id)"',
        [createV2AuthXScopeContext({
          type: "client",
          clientId: "{current_client_id}",
        } as ClientContext)]: "the current client",
      },
      commonClientActions,
    ],
    [
      realm,
      {
        [createV2AuthXScopeContext({
          type: "client",
          clientId: "",
        } as ClientContext)]: "a new client",
        [createV2AuthXScopeContext({
          type: "client",
          clientId: "*",
        } as ClientContext)]: "any new or existing client",
      },
      {
        ...commonClientActions,
        [createV2AuthXScopeAction({
          basic: "*",
          secrets: "*",
        } as ClientAction)]: "create, read and write all fields of",
      },
    ],
  ];

  // Role
  const commonRoleActions = {
    [createV2AuthXScopeAction({
      basic: "r",
      scopes: "",
      users: "",
    } as RoleAction)]: "read the basic fields of",
    [createV2AuthXScopeAction({
      basic: "r",
      scopes: "r",
      users: "",
    } as RoleAction)]: "read scopes of",
    [createV2AuthXScopeAction({
      basic: "r",
      scopes: "",
      users: "r",
    } as RoleAction)]: "read users of",
    [createV2AuthXScopeAction({
      basic: "r",
      scopes: "*",
      users: "*",
    } as RoleAction)]: "read all fields of",
    [createV2AuthXScopeAction({
      basic: "w",
      scopes: "",
      users: "",
    } as RoleAction)]: "write basic fields for",
    [createV2AuthXScopeAction({
      basic: "w",
      scopes: "r",
      users: "",
    } as RoleAction)]: "write scopes for",
    [createV2AuthXScopeAction({
      basic: "w",
      scopes: "",
      users: "r",
    } as RoleAction)]: "write users for",
    [createV2AuthXScopeAction({
      basic: "w",
      scopes: "*",
      users: "*",
    } as RoleAction)]: "write all fields of",
    [createV2AuthXScopeAction({
      basic: "*",
      scopes: "*",
      users: "*",
    } as RoleAction)]: "read and write all fields of",
  };

  const role: [
    DomainDescriptionMap,
    DomainDescriptionMap,
    DomainDescriptionMap
  ][] = [
    [
      realm,
      {
        [createV2AuthXScopeContext({
          type: "role",
          roleId: "(role_id)",
        } as RoleContext)]: 'the role with id "(role_id)"',
      },
      commonRoleActions,
    ],
    [
      realm,
      {
        [createV2AuthXScopeContext({
          type: "role",
          roleId: "",
        } as RoleContext)]: "a new role",
        [createV2AuthXScopeContext({
          type: "role",
          roleId: "*",
        } as RoleContext)]: "any new or existing role",
      },
      {
        ...commonRoleActions,
        [createV2AuthXScopeAction({
          basic: "*",
          scopes: "*",
          users: "*",
        } as RoleAction)]: "create, read and write all fields of",
      },
    ],
  ];

  // User
  const commonUserActions = {
    [createV2AuthXScopeAction({
      basic: "r",
    } as UserAction)]: "read the basic fields of",
    [createV2AuthXScopeAction({
      basic: "w",
    } as UserAction)]: "write basic fields for",
    [createV2AuthXScopeAction({
      basic: "*",
    } as UserAction)]: "read and write basic fields of",
  };

  const user: [
    DomainDescriptionMap,
    DomainDescriptionMap,
    DomainDescriptionMap
  ][] = [
    [
      realm,
      {
        [createV2AuthXScopeContext({
          type: "user",
          userId: "(user_id)",
        } as UserContext)]: 'the user with id "(user_id)"',
        [createV2AuthXScopeContext({
          type: "user",
          userId: "{current_user_id}",
        } as UserContext)]: "the current user",
      },
      commonUserActions,
    ],
    [
      realm,
      {
        [createV2AuthXScopeContext({
          type: "user",
          userId: "",
        } as UserContext)]: "a new user",
        [createV2AuthXScopeContext({
          type: "user",
          userId: "*",
        } as UserContext)]: "any new or existing user",
      },
      {
        ...commonUserActions,
        [createV2AuthXScopeAction({
          basic: "*",
        } as UserAction)]: "create, read and write basic fields of",
      },
    ],
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
        [createV2AuthXScopeContext({
          type: "credential",
          authorityId: "(authority_id)",
          credentialId: "(credential_id)",
          userId: "(user_id)",
        } as CredentialContext)]: 'the credential with id "(credential_id)"',

        [createV2AuthXScopeContext({
          type: "credential",
          authorityId: "(authority_id)",
          credentialId: "*",
          userId: "(user_id)",
        } as CredentialContext)]: 'any new or existing credential belonging to both the user with id "(user_id)" and authority with id "(authority_id)"',
        [createV2AuthXScopeContext({
          type: "credential",
          authorityId: "(authority_id)",
          credentialId: "*",
          userId: "{current_user_id}",
        } as CredentialContext)]: 'any new or existing credential belonging to both the current user and authority with id "(authority_id)"',
        [createV2AuthXScopeContext({
          type: "credential",
          authorityId: "*",
          credentialId: "*",
          userId: "(user_id)",
        } as CredentialContext)]: 'any new or existing credential belonging to the user with id "(user_id)"',
        [createV2AuthXScopeContext({
          type: "credential",
          authorityId: "*",
          credentialId: "*",
          userId: "{current_user_id}",
        } as CredentialContext)]: "any new or existing credential belonging to the current user",
        [createV2AuthXScopeContext({
          type: "credential",
          authorityId: "(authority_id)",
          credentialId: "*",
          userId: "*",
        } as CredentialContext)]: 'any new or existing credential belonging to the authority with id "(authority_id)"',

        [createV2AuthXScopeContext({
          type: "credential",
          authorityId: "*",
          credentialId: "*",
          userId: "*",
        } as CredentialContext)]: "any new or existing credential",
      },
      {
        [createV2AuthXScopeAction({
          basic: "r",
          details: "",
        } as CredentialAction)]: "read the basic fields of",
        [createV2AuthXScopeAction({
          basic: "r",
          details: "r",
        } as CredentialAction)]: "read potentially sensitive details of",
        [createV2AuthXScopeAction({
          basic: "r",
          details: "*",
        } as CredentialAction)]: "read all fields of",
        [createV2AuthXScopeAction({
          basic: "w",
          details: "",
        } as CredentialAction)]: "write basic fields for",
        [createV2AuthXScopeAction({
          basic: "w",
          details: "w",
        } as CredentialAction)]: "write potentially sensitive details for",
        [createV2AuthXScopeAction({
          basic: "w",
          details: "*",
        } as CredentialAction)]: "write all fields of",
        [createV2AuthXScopeAction({
          basic: "*",
          details: "*",
        } as CredentialAction)]: "create, read and write all fields of",
      },
    ],
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
        [createV2AuthXScopeContext({
          type: "grant",
          clientId: "(client_id)",
          grantId: "(grant_id)",
          userId: "(user_id)",
        } as GrantContext)]: 'the grant with id "(grant_id)"',
        [createV2AuthXScopeContext({
          type: "grant",
          clientId: "{current_client_id}",
          grantId: "{current_grant_id}",
          userId: "{current_user_id}",
        } as GrantContext)]: "the current grant",

        [createV2AuthXScopeContext({
          type: "grant",
          clientId: "(client_id)",
          grantId: "*",
          userId: "(user_id)",
        } as GrantContext)]: 'any new or existing grant belonging to both the user with id "(user_id)" and the client with id "(client_id)"',
        [createV2AuthXScopeContext({
          type: "grant",
          clientId: "{current_client_id}",
          grantId: "*",
          userId: "{current_user_id}",
        } as GrantContext)]: "any new or existing grant belonging to both the current user and the current client",
        [createV2AuthXScopeContext({
          type: "grant",
          clientId: "(client_id)",
          grantId: "*",
          userId: "{current_user_id}",
        } as GrantContext)]: 'any new or existing grant belonging to both the current user and the client with id "(client_id)"',
        [createV2AuthXScopeContext({
          type: "grant",
          clientId: "{current_client_id}",
          grantId: "*",
          userId: "(user_id)",
        } as GrantContext)]: 'any new or existing grant belonging to both the user with id "(user_id)" and the current client',

        [createV2AuthXScopeContext({
          type: "grant",
          clientId: "*",
          grantId: "*",
          userId: "(user_id)",
        } as GrantContext)]: 'any new or existing grant belonging to the user with id "(user_id)"',
        [createV2AuthXScopeContext({
          type: "grant",
          clientId: "*",
          grantId: "*",
          userId: "{current_user_id}",
        } as GrantContext)]: "any new or existing grant belonging to the current user",
        [createV2AuthXScopeContext({
          type: "grant",
          clientId: "(client_id)",
          grantId: "*",
          userId: "*",
        } as GrantContext)]: 'any new or existing grant belonging to the client with id "(client_id)"',
        [createV2AuthXScopeContext({
          type: "grant",
          clientId: "{current_client_id}",
          grantId: "*",
          userId: "*",
        } as GrantContext)]: "any new or existing grant belonging to the current client",

        [createV2AuthXScopeContext({
          type: "grant",
          clientId: "*",
          grantId: "*",
          userId: "*",
        } as GrantContext)]: "any new or existing grant",
      },
      {
        [createV2AuthXScopeAction({
          basic: "r",
          scopes: "",
          secrets: "",
        } as GrantAction)]: "read the basic fields of",
        [createV2AuthXScopeAction({
          basic: "r",
          scopes: "r",
          secrets: "",
        } as GrantAction)]: "read scopes of",
        [createV2AuthXScopeAction({
          basic: "r",
          scopes: "",
          secrets: "r",
        } as GrantAction)]: "read secrets of",
        [createV2AuthXScopeAction({
          basic: "r",
          scopes: "*",
          secrets: "*",
        } as GrantAction)]: "read all fields of",
        [createV2AuthXScopeAction({
          basic: "w",
          scopes: "",
          secrets: "",
        } as GrantAction)]: "write basic fields for",
        [createV2AuthXScopeAction({
          basic: "w",
          scopes: "w",
          secrets: "",
        } as GrantAction)]: "write scopes for",
        [createV2AuthXScopeAction({
          basic: "w",
          scopes: "",
          secrets: "w",
        } as GrantAction)]: "write secrets for",
        [createV2AuthXScopeAction({
          basic: "w",
          scopes: "*",
          secrets: "*",
        } as GrantAction)]: "write all fields for",
        [createV2AuthXScopeAction({
          basic: "*",
          scopes: "*",
          secrets: "*",
        } as GrantAction)]: "create, read and write all fields for",
      },
    ],
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
        [createV2AuthXScopeContext({
          type: "authorization",
          authorizationId: "(authorization_id)",
          clientId: "(client_id)",
          grantId: "(grant_id)",
          userId: "(user_id)",
        } as AuthorizationContext)]: 'the authorization with id "(authorization_id)',
        [createV2AuthXScopeContext({
          type: "authorization",
          authorizationId: "{current_authorization_id}",
          clientId: "{current_client_id}",
          grantId: "{current_grant_id}",
          userId: "{current_user_id}",
        } as AuthorizationContext)]: "the current authorization",

        [createV2AuthXScopeContext({
          type: "authorization",
          authorizationId: "*",
          clientId: "(client_id)",
          grantId: "(grant_id)",
          userId: "(user_id)",
        } as AuthorizationContext)]: 'any new or existing authorization belonging to the grant with id "(grant_id)"',
        [createV2AuthXScopeContext({
          type: "authorization",
          authorizationId: "*",
          clientId: "{current_client_id}",
          grantId: "{current_grant_id}",
          userId: "{current_user_id}",
        } as AuthorizationContext)]: "any new or existing authorization belonging to the current grant",

        [createV2AuthXScopeContext({
          type: "authorization",
          authorizationId: "*",
          clientId: "(client_id)",
          grantId: "*",
          userId: "(user_id)",
        } as AuthorizationContext)]: 'any new or existing authorization belonging to both the user with id "(user_id)" and the client with id "(client_id)"',
        [createV2AuthXScopeContext({
          type: "authorization",
          authorizationId: "*",
          clientId: "{current_client_id}",
          grantId: "*",
          userId: "{current_user_id}",
        } as AuthorizationContext)]: "any new or existing authorization belonging to both the current user and the current client",
        [createV2AuthXScopeContext({
          type: "authorization",
          authorizationId: "*",
          clientId: "{current_client_id}",
          grantId: "*",
          userId: "(user_id)",
        } as AuthorizationContext)]: 'any new or existing authorization belonging to both the user with id "(user_id)" and the current client',
        [createV2AuthXScopeContext({
          type: "authorization",
          authorizationId: "*",
          clientId: "(client_id)",
          grantId: "*",
          userId: "{current_user_id}",
        } as AuthorizationContext)]: 'any new or existing authorization belonging to both the current user and the client with id "(client_id)"',

        [createV2AuthXScopeContext({
          type: "authorization",
          authorizationId: "*",
          clientId: "(client_id)",
          grantId: "*",
          userId: "*",
        } as AuthorizationContext)]: 'any new or existing authorization belonging to the client with id "(client_id)"',
        [createV2AuthXScopeContext({
          type: "authorization",
          authorizationId: "*",
          clientId: "{current_client_id}",
          grantId: "*",
          userId: "*",
        } as AuthorizationContext)]: "any new or existing authorization belonging to the current client",

        [createV2AuthXScopeContext({
          type: "authorization",
          authorizationId: "*",
          clientId: "*",
          grantId: "*",
          userId: "(user_id)",
        } as AuthorizationContext)]: 'any new or existing authorization belonging to the user with id "(user_id)"',
        [createV2AuthXScopeContext({
          type: "authorization",
          authorizationId: "*",
          clientId: "*",
          grantId: "*",
          userId: "{current_user_id}",
        } as AuthorizationContext)]: "any new or existing authorization belonging to the current user",

        [createV2AuthXScopeContext({
          type: "authorization",
          authorizationId: "*",
          clientId: "*",
          grantId: "*",
          userId: "*",
        } as AuthorizationContext)]: "any new or existing authorization",
      },
      {
        [createV2AuthXScopeAction({
          basic: "r",
          scopes: "",
          secrets: "",
        } as AuthorizationAction)]: "read the basic fields of",
        [createV2AuthXScopeAction({
          basic: "r",
          scopes: "r",
          secrets: "",
        } as AuthorizationAction)]: "read scopes of",
        [createV2AuthXScopeAction({
          basic: "r",
          scopes: "",
          secrets: "r",
        } as AuthorizationAction)]: "read secrets of",
        [createV2AuthXScopeAction({
          basic: "r",
          scopes: "*",
          secrets: "*",
        } as AuthorizationAction)]: "read all fields of",
        [createV2AuthXScopeAction({
          basic: "w",
          scopes: "",
          secrets: "",
        } as AuthorizationAction)]: "write basic fields for",
        [createV2AuthXScopeAction({
          basic: "w",
          scopes: "w",
          secrets: "",
        } as AuthorizationAction)]: "write scopes for",
        [createV2AuthXScopeAction({
          basic: "w",
          scopes: "",
          secrets: "w",
        } as AuthorizationAction)]: "write secrets for",
        [createV2AuthXScopeAction({
          basic: "w",
          scopes: "*",
          secrets: "*",
        } as AuthorizationAction)]: "write all fields for",
        [createV2AuthXScopeAction({
          basic: "*",
          scopes: "*",
          secrets: "*",
        } as AuthorizationAction)]: "create, read and write all fields for",
      },
    ],
  ];

  return generate([
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
        "*.*.*.*.*": "create, read, and write all fields for",
      },
    ],
  ]);
}
