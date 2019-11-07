import test from "ava";
import { generateExplanationTemplates, getExplanations } from "./explanations";

const userExplanationTemplates = [
  {
    scope: "authx:v2.user.......(user_id):r....",
    description: 'AuthX: Read the basic fields of the user with id "(user_id)".'
  },
  {
    scope: "authx:v2.user.......(user_id):w....",
    description: 'AuthX: Write basic fields for the user with id "(user_id)".'
  },
  {
    scope: "authx:v2.user.......(user_id):*....",
    description:
      'AuthX: Read and write basic fields of the user with id "(user_id)".'
  },
  {
    scope: "authx:v2.user.......{current_user_id}:r....",
    description: "AuthX: Read the basic fields of the current user."
  },
  {
    scope: "authx:v2.user.......{current_user_id}:w....",
    description: "AuthX: Write basic fields for the current user."
  },
  {
    scope: "authx:v2.user.......{current_user_id}:*....",
    description: "AuthX: Read and write basic fields of the current user."
  },
  {
    scope: "authx:v2.user.......:r....",
    description: "AuthX: Read the basic fields of a new user."
  },
  {
    scope: "authx:v2.user.......:w....",
    description: "AuthX: Write basic fields for a new user."
  },
  {
    scope: "authx:v2.user.......:*....",
    description: "AuthX: Create, read and write basic fields of a new user."
  },
  {
    scope: "authx:v2.user.......*:r....",
    description: "AuthX: Read the basic fields of any new or existing user."
  },
  {
    scope: "authx:v2.user.......*:w....",
    description: "AuthX: Write basic fields for any new or existing user."
  },
  {
    scope: "authx:v2.user.......*:*....",
    description:
      "AuthX: Create, read and write basic fields of any new or existing user."
  }
];

test("generateExplanationTemplates", t => {
  t.deepEqual(
    generateExplanationTemplates([
      [
        { authx: "AuthX" },
        {
          "v2.user.......(user_id)": 'the user with id "(user_id)"',
          "v2.user.......{current_user_id}": "the current user"
        },
        {
          "r....": "read the basic fields of",
          "w....": "write basic fields for",
          "*....": "read and write basic fields of"
        }
      ],
      [
        { authx: "AuthX" },
        {
          "v2.user.......": "a new user",
          "v2.user.......*": "any new or existing user"
        },
        {
          "r....": "read the basic fields of",
          "w....": "write basic fields for",
          "*....": "create, read and write basic fields of"
        }
      ]
    ]),
    userExplanationTemplates
  );
});

test("basic equal", t => {
  t.deepEqual(
    getExplanations(
      userExplanationTemplates,
      {
        currentAuthorizationId: "a",
        currentClientId: "b",
        currentGrantId: "c",
        currentUserId: "d"
      },
      ["authx:v2.user.......:r...."]
    ),
    [
      {
        scope: "authx:v2.user.......:r....",
        description: "AuthX: Read the basic fields of a new user."
      }
    ]
  );
});

test("basic superset", t => {
  t.deepEqual(
    getExplanations(
      userExplanationTemplates,
      {
        currentAuthorizationId: "a",
        currentClientId: "b",
        currentGrantId: "c",
        currentUserId: "d"
      },
      ["authx:v2.user.......*:r...."]
    ),
    [
      {
        scope: "authx:v2.user.......*:r....",
        description: "AuthX: Read the basic fields of any new or existing user."
      }
    ]
  );
});

test("excessive superset", t => {
  t.deepEqual(
    getExplanations(
      userExplanationTemplates,
      {
        currentAuthorizationId: "a",
        currentClientId: "b",
        currentGrantId: "c",
        currentUserId: "d"
      },
      ["authx:v2.user....*.*.*.*:r...."]
    ),
    [
      {
        scope: "authx:v2.user.......*:r....",
        description: "AuthX: Read the basic fields of any new or existing user."
      }
    ]
  );
});

test("basic static substitution", t => {
  t.deepEqual(
    getExplanations(
      userExplanationTemplates,
      {
        currentAuthorizationId: "a",
        currentClientId: "b",
        currentGrantId: "c",
        currentUserId: "d"
      },
      ["authx:v2.user.......d:r...."]
    ),
    [
      {
        scope: "authx:v2.user.......d:r....",
        description: "AuthX: Read the basic fields of the current user."
      }
    ]
  );
});

test("basic dynamic substitution", t => {
  t.deepEqual(
    getExplanations(
      userExplanationTemplates,
      {
        currentAuthorizationId: "a",
        currentClientId: "b",
        currentGrantId: "c",
        currentUserId: "d"
      },
      ["authx:v2.user.......x:r...."]
    ),
    [
      {
        scope: "authx:v2.user.......x:r....",
        description: 'AuthX: Read the basic fields of the user with id "x".'
      }
    ]
  );
});
