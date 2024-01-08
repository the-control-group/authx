import t from "ava";

import {
  getDifference,
  getIntersection,
  hasIntersection,
  isSuperset,
  isEqual,
  normalize,
  simplify,
} from "./scope.js";

import { print } from "./print.js";
import { parseScopeLiteral } from "./parse.js";

[
  { a: ["a:b:c"], b: ["a:b:c"], result: true },
  { a: ["a.x:b:c"], b: ["a:b:c"], result: false },
  { a: ["a:b:c"], b: ["a.x:b:c"], result: false },
  { a: ["*:b:c"], b: ["a:b:c"], result: false },
  { a: ["a:b:c"], b: ["*:b:c"], result: false },
  { a: ["**.**:b:c"], b: ["*.**:b:c"], result: true },
].forEach(({ a, b, result }) => {
  t(`isEqual ${a} ${b} => ${result}`, (t) =>
    t.deepEqual(
      isEqual(a.map(parseScopeLiteral), b.map(parseScopeLiteral)),
      result
    )
  );
});

[
  { scope: "client:resource:action", result: "client:resource:action" },
  { scope: "a.b.c:resource:action", result: "a.b.c:resource:action" },
  { scope: "*.*.c:resource:action", result: "*.*.c:resource:action" },
  { scope: "*.b.*:resource:action", result: "*.b.*:resource:action" },
  { scope: "a.*.*:resource:action", result: "a.*.*:resource:action" },
  { scope: "*.*.*:resource:action", result: "*.*.*:resource:action" },
  { scope: "*.**.c:resource:action", result: "*.**.c:resource:action" },
  { scope: "**.*.c:resource:action", result: "*.**.c:resource:action" },
  { scope: "**.b.*:resource:action", result: "**.b.*:resource:action" },
  { scope: "*.b.**:resource:action", result: "*.b.**:resource:action" },
  { scope: "**.b.**:resource:action", result: "**.b.**:resource:action" },
  { scope: "a.**.*:resource:action", result: "a.*.**:resource:action" },
  { scope: "a.*.**:resource:action", result: "a.*.**:resource:action" },
  { scope: "**.*.*:resource:action", result: "*.*.**:resource:action" },
  { scope: "*.**.*:resource:action", result: "*.*.**:resource:action" },
  { scope: "*.*.**:resource:action", result: "*.*.**:resource:action" },
  { scope: "**.**.c:resource:action", result: "*.**.c:resource:action" },
  { scope: "*.**.**:resource:action", result: "*.*.**:resource:action" },
  { scope: "**.*.**:resource:action", result: "*.*.**:resource:action" },
  { scope: "**.**.**:resource:action", result: "*.*.**:resource:action" },
].forEach(({ scope, result }) => {
  t(`normalize template ${scope} => ${result}`, (t) =>
    t.is(print(normalize(parseScopeLiteral(scope))), result)
  );
});

[
  { a: ["client:resource:action"], b: ["client:resource:action"], result: [] },
  {
    a: ["client:resource:action"],
    b: ["wrongclient:resource:action"],
    result: ["wrongclient:resource:action"],
  },
  {
    a: ["client:resource:action"],
    b: ["client:wrongresource:action"],
    result: ["client:wrongresource:action"],
  },
  {
    a: ["client:resource:action"],
    b: ["client:resource:wrongaction"],
    result: ["client:resource:wrongaction"],
  },
  {
    a: ["client:resource:action"],
    b: ["client.a:resource.b:action.c"],
    result: ["client.a:resource.b:action.c"],
  },
  {
    a: ["client.*:resource:action"],
    b: ["client.a:resource:action"],
    result: [],
  },
  {
    a: ["client.*:resource:action"],
    b: ["client.*:resource:action"],
    result: [],
  },
  {
    a: ["client.*:resource:action"],
    b: ["client.**:resource:action"],
    result: ["client.**:resource:action"],
  },
  {
    a: ["client.a:resource:action"],
    b: ["client.*:resource:action"],
    result: ["client.*:resource:action"],
  },
  {
    a: ["client.*:resource:action"],
    b: ["client:resource:action"],
    result: ["client:resource:action"],
  },
  {
    a: ["client.*:resource:action"],
    b: ["client:resource.a:action"],
    result: ["client:resource.a:action"],
  },
  {
    a: ["client.*:resource:action"],
    b: ["client.a.b:resource:action"],
    result: ["client.a.b:resource:action"],
  },
  {
    a: ["client.*:resource:action"],
    b: ["client.a:wrongresource:action"],
    result: ["client.a:wrongresource:action"],
  },
  {
    a: ["client.*:resource:action"],
    b: ["client.a:resource:wrongaction"],
    result: ["client.a:resource:wrongaction"],
  },
  {
    a: ["client.**:resource:action"],
    b: ["client.a:resource:action"],
    result: [],
  },
  {
    a: ["client.**:resource:action"],
    b: ["client.a.b:resource:action"],
    result: [],
  },
  {
    a: ["client.a:resource:action"],
    b: ["client.**:resource:action"],
    result: ["client.**:resource:action"],
  },
  {
    a: ["client.a.b:resource:action"],
    b: ["client.**:resource:action"],
    result: ["client.**:resource:action"],
  },
  {
    a: ["client.**:resource:action"],
    b: ["client:resource:action"],
    result: ["client:resource:action"],
  },
  {
    a: ["client.**:resource:action"],
    b: ["client:resource.a:action"],
    result: ["client:resource.a:action"],
  },
  {
    a: ["client:resource:action"],
    b: ["client.**:resource:action"],
    result: ["client.**:resource:action"],
  },
  {
    a: ["client:resource:action"],
    b: ["client.**:resource.a:action"],
    result: ["client.**:resource.a:action"],
  },
  {
    a: ["client.**:resource:action"],
    b: ["client.a:wrongresource:action"],
    result: ["client.a:wrongresource:action"],
  },
  {
    a: ["client.**:resource:action"],
    b: ["client.a:resource:wrongaction"],
    result: ["client.a:resource:wrongaction"],
  },
  {
    a: ["client.b:resource:action", "client.c:resource:action"],
    b: ["client.a:resource:action"],
    result: ["client.a:resource:action"],
  },
  {
    a: ["other.b:resource:action", "client.*:resource:action"],
    b: ["client.a:resource:action"],
    result: [],
  },
  {
    a: ["client.*:resource:action", "other.b:resource:action"],
    b: ["client.a:resource:action"],
    result: [],
  },
  {
    a: ["client.b:resource:action", "client.a:resource:action"],
    b: ["client.*:resource:action"],
    result: ["client.*:resource:action"],
  },
  {
    a: ["client.*:resource:action"],
    b: ["client.a:resource:action", "client.c:resource:action"],
    result: [],
  },
  {
    a: ["client.*:resource:action", "other.b:resource:action"],
    b: ["client.a:resource:action", "client.c:resource:action"],
    result: [],
  },
  { a: ["a:b:c", "x:y:z"], b: ["a:b:c", "x:y:z"], result: [] },
].forEach(({ a, b, result }) => {
  t(`getDifference ${a} ${b} => ${result}`, (t) =>
    t.deepEqual(
      getDifference(a.map(parseScopeLiteral), b.map(parseScopeLiteral)).map(
        print
      ),
      result
    )
  );
});

[
  {
    a: ["client:resource:action"],
    b: ["client:resource:action"],
    result: true,
  },
  {
    a: ["client:resource:action"],
    b: ["wrongclient:resource:action"],
    result: false,
  },
  {
    a: ["client:resource:action"],
    b: ["client:wrongresource:action"],
    result: false,
  },
  {
    a: ["client:resource:action"],
    b: ["client:resource:wrongaction"],
    result: false,
  },
  {
    a: ["client:resource:action"],
    b: ["client.a:resource.b:action.c"],
    result: false,
  },
  {
    a: ["client.*:resource:action"],
    b: ["client.a:resource:action"],
    result: true,
  },
  {
    a: ["client.*:resource:action"],
    b: ["client.*:resource:action"],
    result: true,
  },
  {
    a: ["client.*:resource:action"],
    b: ["client.**:resource:action"],
    result: false,
  },
  {
    a: ["client.a:resource:action"],
    b: ["client.*:resource:action"],
    result: false,
  },
  {
    a: ["client.*:resource:action"],
    b: ["client:resource:action"],
    result: false,
  },
  {
    a: ["client.*:resource:action"],
    b: ["client:resource.a:action"],
    result: false,
  },
  {
    a: ["client.*:resource:action"],
    b: ["client.a.b:resource:action"],
    result: false,
  },
  {
    a: ["client.*:resource:action"],
    b: ["client.a:wrongresource:action"],
    result: false,
  },
  {
    a: ["client.*:resource:action"],
    b: ["client.a:resource:wrongaction"],
    result: false,
  },
  {
    a: ["client.**:resource:action"],
    b: ["client.a:resource:action"],
    result: true,
  },
  {
    a: ["client.**:resource:action"],
    b: ["client.a.b:resource:action"],
    result: true,
  },
  {
    a: ["client.a:resource:action"],
    b: ["client.**:resource:action"],
    result: false,
  },
  {
    a: ["client.a.b:resource:action"],
    b: ["client.**:resource:action"],
    result: false,
  },
  {
    a: ["client.**:resource:action"],
    b: ["client:resource:action"],
    result: false,
  },
  {
    a: ["client.**:resource:action"],
    b: ["client:resource.a:action"],
    result: false,
  },
  {
    a: ["client:resource:action"],
    b: ["client.**:resource:action"],
    result: false,
  },
  {
    a: ["client:resource:action"],
    b: ["client.**:resource.a:action"],
    result: false,
  },
  {
    a: ["client.**:resource:action"],
    b: ["client.a:wrongresource:action"],
    result: false,
  },
  {
    a: ["client.**:resource:action"],
    b: ["client.a:resource:wrongaction"],
    result: false,
  },
  {
    a: ["client.b:resource:action", "client.c:resource:action"],
    b: ["client.a:resource:action"],
    result: false,
  },
  {
    a: ["client.b:resource:action", "client.*:resource:action"],
    b: ["client.a:resource:action"],
    result: true,
  },
  {
    a: ["client.b:resource:action", "client.a:resource:action"],
    b: ["client.*:resource:action"],
    result: false,
  },
  {
    a: ["client.*:resource:action", "client.b:resource:action"],
    b: ["client.a:resource:action"],
    result: true,
  },
  { a: ["a:b:c", "x:y:z"], b: ["a:b:c", "x:y:z"], result: true },
].forEach(({ a, b, result }) => {
  t(`isSuperset ${a} ${b} => ${result}`, (t) =>
    t.is(isSuperset(a.map(parseScopeLiteral), b.map(parseScopeLiteral)), result)
  );
});

[
  {
    a: ["client:resource:action"],
    b: ["client:resource:action"],
    result: true,
  },
  {
    a: ["client:resource:action"],
    b: ["wrongclient:resource:action"],
    result: false,
  },
  {
    a: ["client:resource:action"],
    b: ["client:wrongresource:action"],
    result: false,
  },
  {
    a: ["client:resource:action"],
    b: ["client:resource:wrongaction"],
    result: false,
  },
  {
    a: ["client:resource:action"],
    b: ["client.a:resource.b:action.c"],
    result: false,
  },
  {
    a: ["client.*:resource:action"],
    b: ["client.a:resource:action"],
    result: true,
  },
  {
    a: ["client.*:resource:action"],
    b: ["client.*:resource:action"],
    result: true,
  },
  {
    a: ["client.*:resource:action"],
    b: ["client.**:resource:action"],
    result: true,
  },
  {
    a: ["client.a:resource:action"],
    b: ["client.*:resource:action"],
    result: true,
  },
  {
    a: ["client.*:resource:action"],
    b: ["client:resource:action"],
    result: false,
  },
  {
    a: ["client.*:resource:action"],
    b: ["client:resource.a:action"],
    result: false,
  },
  {
    a: ["client.*:resource:action"],
    b: ["client.a.b:resource:action"],
    result: false,
  },
  {
    a: ["client.*:resource:action"],
    b: ["client.a:wrongresource:action"],
    result: false,
  },
  {
    a: ["client.*:resource:action"],
    b: ["client.a:resource:wrongaction"],
    result: false,
  },
  {
    a: ["client.**:resource:action"],
    b: ["client.a:resource:action"],
    result: true,
  },
  {
    a: ["client.**:resource:action"],
    b: ["client.a.b:resource:action"],
    result: true,
  },
  {
    a: ["client.a:resource:action"],
    b: ["client.**:resource:action"],
    result: true,
  },
  {
    a: ["client.a.b:resource:action"],
    b: ["client.**:resource:action"],
    result: true,
  },
  {
    a: ["client.**:resource:action"],
    b: ["client:resource:action"],
    result: false,
  },
  {
    a: ["client.**:resource:action"],
    b: ["client:resource.a:action"],
    result: false,
  },
  {
    a: ["client:resource:action"],
    b: ["client.**:resource:action"],
    result: false,
  },
  {
    a: ["client:resource:action"],
    b: ["client.**:resource.a:action"],
    result: false,
  },
  {
    a: ["client.**:resource:action"],
    b: ["client.a:wrongresource:action"],
    result: false,
  },
  {
    a: ["client.**:resource:action"],
    b: ["client.a:resource:wrongaction"],
    result: false,
  },
  {
    a: ["client.b:resource:action", "client.c:resource:action"],
    b: ["client.a:resource:action"],
    result: false,
  },
  {
    a: ["client.b:resource:action", "client.*:resource:action"],
    b: ["client.a:resource:action"],
    result: true,
  },
  {
    a: ["client.b:resource:action", "client.a:resource:action"],
    b: ["client.*:resource:action"],
    result: true,
  },
  {
    a: ["client.*:resource:action", "client.b:resource:action"],
    b: ["client.a:resource:action"],
    result: true,
  },
].forEach(({ a, b, result }) => {
  t(`hasIntersection ${a} ${b} => ${result}`, (t) =>
    t.is(
      hasIntersection(a.map(parseScopeLiteral), b.map(parseScopeLiteral)),
      result
    )
  );
});

[
  { a: ["a:b:c"], b: ["a:b:c"], result: ["a:b:c"] },
  { a: ["*:b:c"], b: ["a:b:c"], result: ["a:b:c"] },
  { a: ["*:b:c"], b: ["*:b:c"], result: ["*:b:c"] },
  { a: ["**:b:c"], b: ["**:b:c"], result: ["**:b:c"] },
  { a: ["*:b:c"], b: ["**:b:c"], result: ["*:b:c"] },
  { a: ["**:b:c"], b: ["foo.**:b:c"], result: ["foo.**:b:c"] },
  { a: ["**:b:c"], b: ["foo.*:b:c"], result: ["foo.*:b:c"] },
  { a: ["*.y:b:c"], b: ["x.*:b:c"], result: ["x.y:b:c"] },
  { a: ["*.y:b:c"], b: ["x.**:b:c"], result: ["x.y:b:c"] },
  { a: ["**.y:b:c"], b: ["x.**:b:c"], result: ["x.**.y:b:c", "x.y:b:c"] },
  { a: ["*.**:b:c"], b: ["**.*:b:c"], result: ["*.**:b:c"] },
  { a: ["**.*:b:c"], b: ["*.**:b:c"], result: ["*.**:b:c"] },
  { a: ["**.**:b:c"], b: ["*.**:b:c"], result: ["*.**:b:c"] },
  { a: ["**.**:b:c"], b: ["*.*.*:b:c"], result: ["*.*.*:b:c"] },
  { a: ["*.*.*:b:c"], b: ["**.**:b:c"], result: ["*.*.*:b:c"] },
  { a: ["foo.*:b:c"], b: ["foo.*:b:c"], result: ["foo.*:b:c"] },
  { a: ["foo.**:b:c"], b: ["foo.*:b:c"], result: ["foo.*:b:c"] },
  { a: ["*.y:*:c"], b: ["x.*:b:*"], result: ["x.y:b:c"] },
  { a: ["*:**:c"], b: ["**:*:c"], result: ["*:*:c"] },
  { a: ["*.*.c:y:z"], b: ["a.**:y:z"], result: ["a.*.c:y:z"] },
  { a: ["a.**:x:x"], b: ["**.b:x:x"], result: ["a.**.b:x:x", "a.b:x:x"] },
  { a: ["x:b:c"], b: ["a:b:c"], result: [] },
  { a: ["x:*:c"], b: ["a:b:c"], result: [] },
  { a: ["x:**:c"], b: ["a:b:c"], result: [] },
  { a: ["**:b:c", "a:**:c"], b: ["a:b:c", "x:y:c"], result: ["a:b:c"] },
].forEach(({ a, b, result }) => {
  t(`getIntersection - (${a}) ∩ (${b}) => ${result}`, (t) => {
    t.deepEqual(
      getIntersection(a.map(parseScopeLiteral), b.map(parseScopeLiteral))
        .map(print)
        .sort(),
      result
    );
  });
});

[
  { scopes: [], result: [] },
  { scopes: ["x:b:c"], result: ["x:b:c"] },
  { scopes: ["x:b:c", "a:b:c"], result: ["x:b:c", "a:b:c"] },
  { scopes: ["a:b:c", "a:b:c"], result: ["a:b:c"] },
  { scopes: ["*:b:c", "a:b:c"], result: ["*:b:c"] },
  { scopes: ["*:b:c", "*:b:c"], result: ["*:b:c"] },
  { scopes: ["**:b:c", "**:b:c"], result: ["**:b:c"] },
  { scopes: ["*:b:c", "**:b:c"], result: ["**:b:c"] },
  { scopes: ["**:b:c", "foo.**:b:c"], result: ["**:b:c"] },
  { scopes: ["**:b:c", "foo.*:b:c"], result: ["**:b:c"] },
  { scopes: ["*.y:b:c", "x.*:b:c"], result: ["*.y:b:c", "x.*:b:c"] },
  { scopes: ["foo.*:b:c", "foo.*:b:c"], result: ["foo.*:b:c"] },
  { scopes: ["foo.**:b:c", "foo.*:b:c", "foo.*:b:c"], result: ["foo.**:b:c"] },
  {
    scopes: ["foo.**:b:c", "foo.*:b:c", "foo.*:b:c", "foo.a:b:c"],
    result: ["foo.**:b:c"],
  },
  {
    scopes: ["foo.a:b:c", "foo.*:b:c", "foo.*:b:c", "foo.**:b:c"],
    result: ["foo.**:b:c"],
  },
  {
    scopes: [
      "AuthX:credential.incontact.me:read",
      "AuthX:credential.incontact.user:read",
      "AuthX:credential.*.me:*",
    ],
    result: ["AuthX:credential.*.me:*", "AuthX:credential.incontact.user:read"],
  },
].forEach(({ scopes, result }) => {
  t(`simplify - (${scopes.join(") • (")}) => ${result}`, (t) => {
    t.deepEqual(
      simplify(scopes.map(parseScopeLiteral)).map(print).sort(),
      result.sort()
    );
  });
});
