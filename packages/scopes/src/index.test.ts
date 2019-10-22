import t from "ava";

import {
  getDifference,
  getIntersection,
  hasIntersection,
  isSuperset,
  normalize,
  simplify,
  isValid,
  InvalidScopeError
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

// TODO: isEqual

// TODO: isStrictSubset

// TODO: isStrictSuperset

// TODO: isSubset

t("isSuperset (valid)", t => {
  t.deepEqual(
    isSuperset("realm.**:resource:action", "realm.a:resource:action"),
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

t("isValid (valid)", t => {
  t.is(isValid("client:resource:action."), true);
});
t("isValid (invalid)", t => {
  t.is(isValid("client:resource:act:ion."), false);
});

t("normalize (valid)", t => {
  t.is(normalize("**.**.c:resource:action"), "*.**.c:resource:action");
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
t("simplify (invalid)", t => {
  t.throws(() =>
    simplify(["realm.a:resource:action", "realm.b:resource:act:ion"])
  );
});
