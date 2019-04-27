import t from "ava";

import {
  validate,
  normalize,
  isSuperset,
  hasIntersection,
  getIntersection,
  simplify
} from ".";

([
  { args: ["client"], result: false },
  { args: ["client:"], result: false },
  { args: ["client:resource"], result: false },
  { args: ["client:resource:"], result: false },
  { args: ["client:resource:action:"], result: false },
  { args: ["a.%:resource:action"], result: false },
  { args: ["a*.b:resource:action"], result: false },
  { args: ["client:resource:action"], result: true },
  { args: ["a.b.c:d.e.f:g.h.i"], result: true },
  { args: ["*.b.c:d.*.f:g.h.*"], result: true },
  { args: ["**.b.c:d.**.f:g.h.**"], result: true },
  { args: ["*:*:*"], result: true },
  { args: ["**:**:**"], result: true },
  { args: ["***:**:**"], result: false }
] as { args: [string]; result: boolean }[]).forEach(({ args, result }) => {
  t(`validate ${args[0]} => ${result}`, t => t.is(validate(...args), result));
});

([
  { args: ["client:resource:action"], result: "client:resource:action" },
  { args: ["a.b.c:resource:action"], result: "a.b.c:resource:action" },
  { args: ["*.*.c:resource:action"], result: "*.*.c:resource:action" },
  { args: ["*.b.*:resource:action"], result: "*.b.*:resource:action" },
  { args: ["a.*.*:resource:action"], result: "a.*.*:resource:action" },
  { args: ["*.*.*:resource:action"], result: "*.*.*:resource:action" },
  { args: ["*.**.c:resource:action"], result: "*.**.c:resource:action" },
  { args: ["**.*.c:resource:action"], result: "*.**.c:resource:action" },
  { args: ["**.b.*:resource:action"], result: "**.b.*:resource:action" },
  { args: ["*.b.**:resource:action"], result: "*.b.**:resource:action" },
  { args: ["**.b.**:resource:action"], result: "**.b.**:resource:action" },
  { args: ["a.**.*:resource:action"], result: "a.*.**:resource:action" },
  { args: ["a.*.**:resource:action"], result: "a.*.**:resource:action" },
  { args: ["**.*.*:resource:action"], result: "*.*.**:resource:action" },
  { args: ["*.**.*:resource:action"], result: "*.*.**:resource:action" },
  { args: ["*.*.**:resource:action"], result: "*.*.**:resource:action" },
  { args: ["**.**.c:resource:action"], result: "*.**.c:resource:action" },
  { args: ["*.**.**:resource:action"], result: "*.*.**:resource:action" },
  { args: ["**.*.**:resource:action"], result: "*.*.**:resource:action" },
  { args: ["**.**.**:resource:action"], result: "*.*.**:resource:action" }
] as { args: [string]; result: string }[]).forEach(({ args, result }) => {
  t(`normalize ${args[0]} => ${result}`, t => t.is(normalize(...args), result));
});

([
  { args: ["client:resource:action", "client:resource:action"], result: true },
  {
    args: ["client:resource:action", "wrongclient:resource:action"],
    result: false
  },
  {
    args: ["client:resource:action", "client:wrongresource:action"],
    result: false
  },
  {
    args: ["client:resource:action", "client:resource:wrongaction"],
    result: false
  },
  {
    args: ["client:resource:action", "client.a:resource.b:action.c"],
    result: false
  },
  {
    args: ["client.*:resource:action", "client.a:resource:action"],
    result: true
  },
  {
    args: ["client.*:resource:action", "client.*:resource:action"],
    result: true
  },
  {
    args: ["client.*:resource:action", "client.**:resource:action"],
    result: false
  },
  {
    args: ["client.a:resource:action", "client.*:resource:action"],
    result: false
  },
  {
    args: ["client.*:resource:action", "client:resource:action"],
    result: false
  },
  {
    args: ["client.*:resource:action", "client:resource.a:action"],
    result: false
  },
  {
    args: ["client.*:resource:action", "client.a.b:resource:action"],
    result: false
  },
  {
    args: ["client.*:resource:action", "client.a:wrongresource:action"],
    result: false
  },
  {
    args: ["client.*:resource:action", "client.a:resource:wrongaction"],
    result: false
  },
  {
    args: ["client.**:resource:action", "client.a:resource:action"],
    result: true
  },
  {
    args: ["client.**:resource:action", "client.a.b:resource:action"],
    result: true
  },
  {
    args: ["client.a:resource:action", "client.**:resource:action"],
    result: false
  },
  {
    args: ["client.a.b:resource:action", "client.**:resource:action"],
    result: false
  },
  {
    args: ["client.**:resource:action", "client:resource:action"],
    result: false
  },
  {
    args: ["client.**:resource:action", "client:resource.a:action"],
    result: false
  },
  {
    args: ["client:resource:action", "client.**:resource:action"],
    result: false
  },
  {
    args: ["client:resource:action", "client.**:resource.a:action"],
    result: false
  },
  {
    args: ["client.**:resource:action", "client.a:wrongresource:action"],
    result: false
  },
  {
    args: ["client.**:resource:action", "client.a:resource:wrongaction"],
    result: false
  },
  {
    args: [
      ["client.b:resource:action", "client.c:resource:action"],
      "client.a:resource:action"
    ],
    result: false
  },
  {
    args: [
      ["client.b:resource:action", "client.*:resource:action"],
      "client.a:resource:action"
    ],
    result: true
  },
  {
    args: [
      ["client.b:resource:action", "client.a:resource:action"],
      "client.*:resource:action"
    ],
    result: false
  },
  {
    args: [
      ["client.*:resource:action", "client.b:resource:action"],
      "client.a:resource:action"
    ],
    result: true
  }
] as {
  args: [string, string] | [string[], string];
  result: boolean;
}[]).forEach(({ args, result }) => {
  t(`isSuperset ${args[0]} ${args[1]} => ${result}`, t =>
    t.is(isSuperset(args[0], args[1]), result)
  );
});

([
  {
    args: ["client:resource:action", "client:resource:action"],
    result: true
  },
  {
    args: ["client:resource:action", "wrongclient:resource:action"],
    result: false
  },
  {
    args: ["client:resource:action", "client:wrongresource:action"],
    result: false
  },
  {
    args: ["client:resource:action", "client:resource:wrongaction"],
    result: false
  },
  {
    args: ["client:resource:action", "client.a:resource.b:action.c"],
    result: false
  },
  {
    args: ["client.*:resource:action", "client.a:resource:action"],
    result: true
  },
  {
    args: ["client.*:resource:action", "client.*:resource:action"],
    result: true
  },
  {
    args: ["client.*:resource:action", "client.**:resource:action"],
    result: true
  },
  {
    args: ["client.a:resource:action", "client.*:resource:action"],
    result: true
  },
  {
    args: ["client.*:resource:action", "client:resource:action"],
    result: false
  },
  {
    args: ["client.*:resource:action", "client:resource.a:action"],
    result: false
  },
  {
    args: ["client.*:resource:action", "client.a.b:resource:action"],
    result: false
  },
  {
    args: ["client.*:resource:action", "client.a:wrongresource:action"],
    result: false
  },
  {
    args: ["client.*:resource:action", "client.a:resource:wrongaction"],
    result: false
  },
  {
    args: ["client.**:resource:action", "client.a:resource:action"],
    result: true
  },
  {
    args: ["client.**:resource:action", "client.a.b:resource:action"],
    result: true
  },
  {
    args: ["client.a:resource:action", "client.**:resource:action"],
    result: true
  },
  {
    args: ["client.a.b:resource:action", "client.**:resource:action"],
    result: true
  },
  {
    args: ["client.**:resource:action", "client:resource:action"],
    result: false
  },
  {
    args: ["client.**:resource:action", "client:resource.a:action"],
    result: false
  },
  {
    args: ["client:resource:action", "client.**:resource:action"],
    result: false
  },
  {
    args: ["client:resource:action", "client.**:resource.a:action"],
    result: false
  },
  {
    args: ["client.**:resource:action", "client.a:wrongresource:action"],
    result: false
  },
  {
    args: ["client.**:resource:action", "client.a:resource:wrongaction"],
    result: false
  },
  {
    args: [
      ["client.b:resource:action", "client.c:resource:action"],
      "client.a:resource:action"
    ],
    result: false
  },
  {
    args: [
      ["client.b:resource:action", "client.*:resource:action"],
      "client.a:resource:action"
    ],
    result: true
  },
  {
    args: [
      ["client.b:resource:action", "client.a:resource:action"],
      "client.*:resource:action"
    ],
    result: true
  },
  {
    args: [
      ["client.*:resource:action", "client.b:resource:action"],
      "client.a:resource:action"
    ],
    result: true
  }
] as {
  args: [string, string] | [string[], string];
  result: boolean;
}[]).forEach(({ args, result }) => {
  t(`hasIntersection ${args[0]} ${args[1]} => ${result}`, t =>
    t.is(hasIntersection(args[0], args[1]), result)
  );
});

([
  { args: [["a:b:c"], ["a:b:c"]], result: ["a:b:c"] },
  { args: [["*:b:c"], ["a:b:c"]], result: ["a:b:c"] },
  { args: [["*:b:c"], ["*:b:c"]], result: ["*:b:c"] },
  { args: [["**:b:c"], ["**:b:c"]], result: ["**:b:c"] },
  { args: [["*:b:c"], ["**:b:c"]], result: ["*:b:c"] },
  { args: [["**:b:c"], ["foo.**:b:c"]], result: ["foo.**:b:c"] },
  { args: [["**:b:c"], ["foo.*:b:c"]], result: ["foo.*:b:c"] },
  { args: [["*.y:b:c"], ["x.*:b:c"]], result: ["x.y:b:c"] },
  { args: [["*.y:b:c"], ["x.**:b:c"]], result: ["x.y:b:c"] },
  { args: [["**.y:b:c"], ["x.**:b:c"]], result: ["x.**.y:b:c", "x.y:b:c"] },
  { args: [["*.**:b:c"], ["**.*:b:c"]], result: ["*.**:b:c"] },
  { args: [["**.*:b:c"], ["*.**:b:c"]], result: ["*.**:b:c"] },
  { args: [["**.**:b:c"], ["*.**:b:c"]], result: ["*.**:b:c"] },
  { args: [["**.**:b:c"], ["*.*.*:b:c"]], result: ["*.*.*:b:c"] },
  { args: [["*.*.*:b:c"], ["**.**:b:c"]], result: ["*.*.*:b:c"] },
  { args: [["foo.*:b:c"], ["foo.*:b:c"]], result: ["foo.*:b:c"] },
  { args: [["foo.**:b:c"], ["foo.*:b:c"]], result: ["foo.*:b:c"] },
  { args: [["*.y:*:c"], ["x.*:b:*"]], result: ["x.y:b:c"] },
  { args: [["*:**:c"], ["**:*:c"]], result: ["*:*:c"] },
  { args: [["*.*.c:y:z"], ["a.**:y:z"]], result: ["a.*.c:y:z"] },
  { args: [["a.**:x:x"], ["**.b:x:x"]], result: ["a.**.b:x:x", "a.b:x:x"] },
  { args: [["x:b:c"], ["a:b:c"]], result: [] },
  { args: [["x:*:c"], ["a:b:c"]], result: [] },
  { args: [["x:**:c"], ["a:b:c"]], result: [] },
  { args: [["**:b:c", "a:**:c"], ["a:b:c", "x:y:c"]], result: ["a:b:c"] }
] as { args: [string[], string[]]; result: string[] }[]).forEach(row => {
  t(
    "getIntersection - (" + row.args.join(") ∩ (") + ") => " + row.result,
    t => {
      t.deepEqual(getIntersection(...row.args).sort(), row.result);
    }
  );
});

([
  { args: [[]], result: [] },
  { args: [["x:b:c"]], result: ["x:b:c"] },
  { args: [["x:b:c", "a:b:c"]], result: ["x:b:c", "a:b:c"] },
  { args: [["a:b:c", "a:b:c"]], result: ["a:b:c"] },
  { args: [["*:b:c", "a:b:c"]], result: ["*:b:c"] },
  { args: [["*:b:c", "*:b:c"]], result: ["*:b:c"] },
  { args: [["**:b:c", "**:b:c"]], result: ["**:b:c"] },
  { args: [["*:b:c", "**:b:c"]], result: ["**:b:c"] },
  { args: [["**:b:c", "foo.**:b:c"]], result: ["**:b:c"] },
  { args: [["**:b:c", "foo.*:b:c"]], result: ["**:b:c"] },
  { args: [["*.y:b:c", "x.*:b:c"]], result: ["*.y:b:c", "x.*:b:c"] },
  { args: [["foo.*:b:c", "foo.*:b:c"]], result: ["foo.*:b:c"] },
  {
    args: [["foo.**:b:c", "foo.*:b:c", "foo.*:b:c"]],
    result: ["foo.**:b:c"]
  },
  {
    args: [["foo.**:b:c", "foo.*:b:c", "foo.*:b:c", "foo.a:b:c"]],
    result: ["foo.**:b:c"]
  },
  {
    args: [["foo.a:b:c", "foo.*:b:c", "foo.*:b:c", "foo.**:b:c"]],
    result: ["foo.**:b:c"]
  },
  {
    args: [
      [
        "AuthX:credential.incontact.me:read",
        "AuthX:credential.incontact.user:read",
        "AuthX:credential.*.me:*"
      ]
    ],
    result: ["AuthX:credential.*.me:*", "AuthX:credential.incontact.user:read"]
  }
] as { args: [string[]]; result: string[] }[]).forEach(row => {
  t("simplify - (" + row.args.join(") • (") + ") => " + row.result, t => {
    t.deepEqual(simplify(...row.args).sort(), row.result.sort());
  });
});
