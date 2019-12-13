import t from "ava";

import {
  getDifference,
  getIntersection,
  hasIntersection,
  InvalidScopeError,
  isEqual,
  isSuperset,
  isValidScopeLiteral,
  normalize,
  simplify
} from "./index";

t("getDifference (valid)", t => {
  t.deepEqual(
    getDifference(
      ["realm.b:resource:action", "realm.a:resource:action"],
      ["realm.*:resource:action"]
    ),
    ["realm.*:resource:action"]
  );
});
t("getDifference (template)", t => {
  t.deepEqual(
    getDifference(
      ["realm.b:{resource}:action", "realm.a:{resource}:action"],
      ["realm.*:{resource}:action"]
    ),
    ["realm.*:{resource}:action"]
  );
});
t("getDifference (invalid a)", t => {
  t.throws(
    () =>
      getDifference(
        ["realm.b:resource:act:ion", "realm.a:resource:action"],
        ["realm.*:resource:action"]
      ),
    InvalidScopeError
  );
});
t("getDifference (invalid b)", t => {
  t.throws(
    () =>
      getDifference(
        ["realm.b:resource:action", "realm.a:resource:action"],
        ["realm.*:resource:act:ion"]
      ),
    InvalidScopeError
  );
});

t("getIntersection (valid)", t => {
  t.deepEqual(
    getIntersection(
      ["realm.b:resource:action", "realm.a:resource:action"],
      "realm.*:resource:action"
    ),
    ["realm.a:resource:action", "realm.b:resource:action"]
  );
});

t("getIntersection (template)", t => {
  t.deepEqual(
    getIntersection(
      ["realm.b:{resource}:action", "realm.a:{resource}:action"],
      "realm.*:{resource}:action"
    ),
    ["realm.a:{resource}:action", "realm.b:{resource}:action"]
  );
});
t("getIntersection (invalid a)", t => {
  t.throws(() =>
    getIntersection(
      ["realm.b:resource:act:ion", "realm.a:resource:action"],
      "realm.*:resource:action"
    )
  );
});
t("getIntersection (invalid b)", t => {
  t.throws(() =>
    getIntersection(
      ["realm.b:resource:action", "realm.a:resource:act:ion"],
      "realm.*:resource:action"
    )
  );
});

t("hasIntersection (valid)", t => {
  t.deepEqual(
    hasIntersection(
      ["realm.b:resource:action", "realm.a:resource:action"],
      "realm.*:resource:action"
    ),
    true
  );
});
t("hasIntersection (template)", t => {
  t.deepEqual(
    hasIntersection(
      ["realm.b:{resource}:action", "realm.a:{resource}:action"],
      "realm.*:{resource}:action"
    ),
    true
  );
});
t("hasIntersection (invalid a)", t => {
  t.throws(() =>
    hasIntersection(
      ["realm.b:resource:act:ion", "realm.a:resource:action"],
      "realm.*:resource:action"
    )
  );
});
t("hasIntersection (invalid b)", t => {
  t.throws(() =>
    hasIntersection(
      ["realm.b:resource:action", "realm.a:resource:act:ion"],
      "realm.*:resource:action"
    )
  );
});

t("isSuperset (valid string, valid string) false", t => {
  t.deepEqual(isEqual("realm:**:**", "realm.dev:**:**"), false);
});

t("isSuperset (valid string, valid string) true", t => {
  t.deepEqual(
    isEqual("realm.**:resource:action", "realm.**:resource:action"),
    true
  );
});

// TODO: isStrictSubset

// TODO: isStrictSuperset

// TODO: isSubset

t("isSuperset (valid)", t => {
  t.deepEqual(
    isSuperset("realm.**:resource:action", "realm.a:resource:action"),
    true
  );
});
t("isSuperset (template)", t => {
  t.deepEqual(
    isSuperset("realm.**:{resource}:action", "realm.a:{resource}:action"),
    true
  );
});
t("isSuperset (invalid a)", t => {
  t.throws(() =>
    isSuperset("realm.**:resource:act:ion", "realm.a:resource:action")
  );
});
t("isSuperset (invalid b)", t => {
  t.throws(() =>
    isSuperset("realm.**:resource:action", "realm.a:resource:act:ion")
  );
});

([
  { args: ["client"], result: false },
  { args: ["client:"], result: false },
  { args: ["client:resource"], result: false },
  { args: ["client:resource:"], result: true },
  { args: ["client:resource:action."], result: true },
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
  t(`isValidScopeLiteral ${args[0]} => ${result}`, t =>
    t.is(isValidScopeLiteral(...args), result)
  );
});

t("isValidScopeLiteral (valid)", t => {
  t.is(isValidScopeLiteral("client:resource:action."), true);
});
t("isValidScopeLiteral (template)", t => {
  t.is(isValidScopeLiteral("client:resource:action.{foo}"), false);
});
t("isValidScopeLiteral (invalid)", t => {
  t.is(isValidScopeLiteral("client:resource:act:ion."), false);
});

t("normalize (valid)", t => {
  t.is(normalize("**.**.c:resource:action"), "*.**.c:resource:action");
});
t("normalize (template)", t => {
  t.is(normalize("**.**.c:{resource}:action"), "*.**.c:{resource}:action");
});
t("normalize (invalid)", t => {
  t.throws(() => normalize("**.**.c:resource:act:ion"), InvalidScopeError);
});

t("simplify (valid)", t => {
  t.deepEqual(
    simplify(["realm.b:resource:action", "realm.*:resource:action"]),
    ["realm.*:resource:action"]
  );
});
t("simplify (template)", t => {
  t.deepEqual(
    simplify(["realm.b:{resource}:action", "realm.*:{resource}:action"]),
    ["realm.*:{resource}:action"]
  );
});
t("simplify (invalid)", t => {
  t.throws(() =>
    simplify(["realm.a:resource:action", "realm.b:resource:act:ion"])
  );
});
