import test from "ava";
import { generate, match } from "./explanations.js";

const userExplanationTemplates = [
  {
    scope: "authx:v2.user.......(user_id):r....",
    description:
      'AuthX: Read the basic fields of the user with id "(user_id)".',
  },
  {
    scope: "authx:v2.user.......(user_id):w....",
    description: 'AuthX: Write basic fields for the user with id "(user_id)".',
  },
  {
    scope: "authx:v2.user.......(user_id):*....",
    description:
      'AuthX: Read and write basic fields of the user with id "(user_id)".',
  },
  {
    scope: "authx:v2.user.......{current_user_id}:r....",
    description: "AuthX: Read the basic fields of the current user.",
  },
  {
    scope: "authx:v2.user.......{current_user_id}:w....",
    description: "AuthX: Write basic fields for the current user.",
  },
  {
    scope: "authx:v2.user.......{current_user_id}:*....",
    description: "AuthX: Read and write basic fields of the current user.",
  },
  {
    scope: "authx:v2.user.......:r....",
    description: "AuthX: Read the basic fields of a new user.",
  },
  {
    scope: "authx:v2.user.......:w....",
    description: "AuthX: Write basic fields for a new user.",
  },
  {
    scope: "authx:v2.user.......:*....",
    description: "AuthX: Create, read and write basic fields of a new user.",
  },
  {
    scope: "authx:v2.user.......*:r....",
    description: "AuthX: Read the basic fields of any new or existing user.",
  },
  {
    scope: "authx:v2.user.......*:w....",
    description: "AuthX: Write basic fields for any new or existing user.",
  },
  {
    scope: "authx:v2.user.......*:*....",
    description:
      "AuthX: Create, read and write basic fields of any new or existing user.",
  },
];

const roleExplanationTemplates = [
  // Roles
  {
    scope: "authx:v2.role......(role_id).:r....",
    description:
      'AuthX: Read the basic fields of the role with id "(role_id)".',
  },
  {
    scope: "authx:v2.role......(role_id).:r..r..",
    description: 'AuthX: Read scopes of the role with id "(role_id)".',
  },
  {
    scope: "authx:v2.role......(role_id).:r....r",
    description: 'AuthX: Read users of the role with id "(role_id)".',
  },
  {
    scope: "authx:v2.role......(role_id).:r..*..*",
    description: 'AuthX: Read all fields of the role with id "(role_id)".',
  },
  {
    scope: "authx:v2.role......(role_id).:w....",
    description: 'AuthX: Write basic fields for the role with id "(role_id)".',
  },
  {
    scope: "authx:v2.role......(role_id).:w..w..",
    description: 'AuthX: Write scopes for the role with id "(role_id)".',
  },
  {
    scope: "authx:v2.role......(role_id).:w....w",
    description: 'AuthX: Write users for the role with id "(role_id)".',
  },
  {
    scope: "authx:v2.role......(role_id).:w..*..*",
    description: 'AuthX: Write all fields of the role with id "(role_id)".',
  },
  {
    scope: "authx:v2.role......(role_id).:*..*..*",
    description:
      'AuthX: Read and write all fields of the role with id "(role_id)".',
  },
  {
    scope: "authx:v2.role.......:r....",
    description: "AuthX: Read the basic fields of a new role.",
  },
  {
    scope: "authx:v2.role.......:r..r..",
    description: "AuthX: Read scopes of a new role.",
  },
  {
    scope: "authx:v2.role.......:r....r",
    description: "AuthX: Read users of a new role.",
  },
  {
    scope: "authx:v2.role.......:r..*..*",
    description: "AuthX: Read all fields of a new role.",
  },
  {
    scope: "authx:v2.role.......:w....",
    description: "AuthX: Write basic fields for a new role.",
  },
  {
    scope: "authx:v2.role.......:w..w..",
    description: "AuthX: Write scopes for a new role.",
  },
  {
    scope: "authx:v2.role.......:w....w",
    description: "AuthX: Write users for a new role.",
  },
  {
    scope: "authx:v2.role.......:w..*..*",
    description: "AuthX: Write all fields of a new role.",
  },
  {
    scope: "authx:v2.role.......:*..*..*",
    description: "AuthX: Create, read and write all fields of a new role.",
  },
  {
    scope: "authx:v2.role......*.:r....",
    description: "AuthX: Read the basic fields of any new or existing role.",
  },
  {
    scope: "authx:v2.role......*.:r..r..",
    description: "AuthX: Read scopes of any new or existing role.",
  },
  {
    scope: "authx:v2.role......*.:r....r",
    description: "AuthX: Read users of any new or existing role.",
  },
  {
    scope: "authx:v2.role......*.:r..*..*",
    description: "AuthX: Read all fields of any new or existing role.",
  },
  {
    scope: "authx:v2.role......*.:w....",
    description: "AuthX: Write basic fields for any new or existing role.",
  },
  {
    scope: "authx:v2.role......*.:w..w..",
    description: "AuthX: Write scopes for any new or existing role.",
  },
  {
    scope: "authx:v2.role......*.:w....w",
    description: "AuthX: Write users for any new or existing role.",
  },
  {
    scope: "authx:v2.role......*.:w..*..*",
    description: "AuthX: Write all fields of any new or existing role.",
  },
  {
    scope: "authx:v2.role......*.:*..*..*",
    description:
      "AuthX: Create, read and write all fields of any new or existing role.",
  },
];

test("generateExplanationTemplates", (t) => {
  t.deepEqual(
    generate([
      [
        { authx: "AuthX" },
        {
          "v2.user.......(user_id)": 'the user with id "(user_id)"',
          "v2.user.......{current_user_id}": "the current user",
        },
        {
          "r....": "read the basic fields of",
          "w....": "write basic fields for",
          "*....": "read and write basic fields of",
        },
      ],
      [
        { authx: "AuthX" },
        {
          "v2.user.......": "a new user",
          "v2.user.......*": "any new or existing user",
        },
        {
          "r....": "read the basic fields of",
          "w....": "write basic fields for",
          "*....": "create, read and write basic fields of",
        },
      ],
    ]),
    userExplanationTemplates
  );
});

test("basic equal", (t) => {
  t.deepEqual(
    match(userExplanationTemplates, ["authx:v2.user.......:r...."], {
      currentAuthorizationId: "a",
      currentClientId: "b",
      currentGrantId: "c",
      currentUserId: "d",
    }),
    [
      {
        scope: "authx:v2.user.......:r....",
        description: "AuthX: Read the basic fields of a new user.",
      },
    ]
  );
});

test("basic superset", (t) => {
  t.deepEqual(
    match(userExplanationTemplates, ["authx:v2.user.......*:r...."], {
      currentAuthorizationId: "a",
      currentClientId: "b",
      currentGrantId: "c",
      currentUserId: "d",
    }),
    [
      {
        scope: "authx:v2.user.......*:r....",
        description:
          "AuthX: Read the basic fields of any new or existing user.",
      },
    ]
  );
});

test("excessive superset", (t) => {
  t.deepEqual(
    match(userExplanationTemplates, ["authx:v2.user....*.*.*.*:r...."], {
      currentAuthorizationId: "a",
      currentClientId: "b",
      currentGrantId: "c",
      currentUserId: "d",
    }),
    [
      {
        scope: "authx:v2.user.......*:r....",
        description:
          "AuthX: Read the basic fields of any new or existing user.",
      },
    ]
  );
});

test("anymultiple superset", (t) => {
  t.deepEqual(
    match(
      [...userExplanationTemplates, ...roleExplanationTemplates],
      ["authx:**:**"],
      {
        currentAuthorizationId: "a",
        currentClientId: "b",
        currentGrantId: "c",
        currentUserId: "d",
      }
    ),
    [
      {
        scope: "authx:v2.user.......*:*....",
        description:
          "AuthX: Create, read and write basic fields of any new or existing user.",
      },
      {
        scope: "authx:v2.role......*.:*..*..*",
        description:
          "AuthX: Create, read and write all fields of any new or existing role.",
      },
    ]
  );
});

test("null substitutions", (t) => {
  t.deepEqual(
    match(
      [...userExplanationTemplates, ...roleExplanationTemplates],
      ["authx:**:**"],
      {
        currentAuthorizationId: null,
        currentClientId: null,
        currentGrantId: null,
        currentUserId: null,
      }
    ),
    [
      {
        scope: "authx:v2.user.......*:*....",
        description:
          "AuthX: Create, read and write basic fields of any new or existing user.",
      },
      {
        scope: "authx:v2.role......*.:*..*..*",
        description:
          "AuthX: Create, read and write all fields of any new or existing role.",
      },
    ]
  );
});

test("basic static substitution", (t) => {
  t.deepEqual(
    match(userExplanationTemplates, ["authx:v2.user.......d:r...."], {
      currentAuthorizationId: "a",
      currentClientId: "b",
      currentGrantId: "c",
      currentUserId: "d",
    }),
    [
      {
        scope: "authx:v2.user.......d:r....",
        description: "AuthX: Read the basic fields of the current user.",
      },
    ]
  );
});

test("basic dynamic substitution", (t) => {
  t.deepEqual(
    match(userExplanationTemplates, ["authx:v2.user.......x:r...."], {
      currentAuthorizationId: "a",
      currentClientId: "b",
      currentGrantId: "c",
      currentUserId: "d",
    }),
    [
      {
        scope: "authx:v2.user.......x:r....",
        description: 'AuthX: Read the basic fields of the user with id "x".',
      },
    ]
  );
});
