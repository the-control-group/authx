import test from "ava";
import { humanizeScopes } from "./humanizeScopes";

test("basic equal", t => {
  t.deepEqual(
    humanizeScopes(
      [
        [
          { authx: "AuthX" },
          { "user.c": 'the user with id "c"' },
          { "read.basic": "read the basic fields of" }
        ]
      ],
      { currentAuthorizationId: "a", currentGrantId: "b", currentUserId: "c" },
      ["authx:user.c:read.basic"]
    ),
    ['AuthX: Read the basic fields of the user with id "c".']
  );
});

test("basic superset", t => {
  t.deepEqual(
    humanizeScopes(
      [
        [
          { authx: "AuthX" },
          { "user.c": 'the user with id "c"' },
          { "read.basic": "read the basic fields of" }
        ]
      ],
      { currentAuthorizationId: "a", currentGrantId: "b", currentUserId: "c" },
      ["authx:user.c:read.*"]
    ),
    ['AuthX: Read the basic fields of the user with id "c".']
  );
});

test("basic static substitution", t => {
  t.deepEqual(
    humanizeScopes(
      [
        [
          { authx: "AuthX" },
          { "user.{current_user_id}": "the current user" },
          { "read.basic": "read the basic fields of" }
        ]
      ],
      { currentAuthorizationId: "a", currentGrantId: "b", currentUserId: "c" },
      ["authx:user.c:read.*"]
    ),
    ["AuthX: Read the basic fields of the current user."]
  );
});

test("basic dynamic substitution", t => {
  t.deepEqual(
    humanizeScopes(
      [
        [
          { authx: "AuthX" },
          { "user.(id)": 'the user with id "(id)"' },
          { "read.basic": "read the basic fields of" }
        ]
      ],
      { currentAuthorizationId: "a", currentGrantId: "b", currentUserId: "c" },
      ["authx:user.c:read.*"]
    ),
    ['AuthX: Read the basic fields of the user with id "c".']
  );
});

test("text simplification", t => {
  t.deepEqual(
    humanizeScopes(
      [
        [
          { authx: "AuthX" },
          { "user.(id)": 'the user with id "(id)"' },
          {
            "read.basic": "read the basic fields of",
            "read.*": "read all fields of"
          }
        ]
      ],
      { currentAuthorizationId: "a", currentGrantId: "b", currentUserId: "c" },
      ["authx:user.c:read.*"]
    ),
    ['AuthX: Read all fields of the user with id "c".']
  );
});
