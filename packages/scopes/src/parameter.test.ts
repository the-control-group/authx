import test from "ava";
import { extract } from "./parameter";

import { AnySingle } from "./scope";

import {
  parseScopeLiteral,
  parseParameterizedScopeLiteral,
  InvalidParameterizedScopeError
} from "./parse";

test("extract(template, scopes) - single segment, concrete value", t => {
  t.deepEqual(
    extract(
      parseParameterizedScopeLiteral("foo:(bar):baz"),
      ["foo:aaa:baz"].map(parseScopeLiteral)
    ),
    [
      {
        scope: parseScopeLiteral("foo:aaa:baz"),
        parameters: {
          bar: "aaa"
        }
      }
    ]
  );
});

test("extract(template, scopes) - single segment, any single value", t => {
  t.deepEqual(
    extract(
      parseParameterizedScopeLiteral("foo:(bar):baz"),
      ["foo:*:baz"].map(parseScopeLiteral)
    ),
    [
      {
        scope: parseScopeLiteral("foo:*:baz"),
        parameters: {
          bar: AnySingle
        }
      }
    ]
  );
});

test("extract(template, scopes) - single segment, any multiple value", t => {
  t.deepEqual(
    extract(
      parseParameterizedScopeLiteral("foo:(bar):baz"),
      ["foo:**:baz"].map(parseScopeLiteral)
    ),
    [
      {
        scope: parseScopeLiteral("foo:*:baz"),
        parameters: {
          bar: AnySingle
        }
      }
    ]
  );
});

test("extract(template, scopes) - multiple segments, any multiple value", t => {
  t.deepEqual(
    extract(
      parseParameterizedScopeLiteral("foo:(a).b.(c):baz"),
      ["foo:**:baz"].map(parseScopeLiteral)
    ),
    [
      {
        scope: parseScopeLiteral("foo:*.b.*:baz"),
        parameters: {
          a: AnySingle,
          c: AnySingle
        }
      }
    ]
  );
});

test("extract(template, scopes) - multiple segments with prefix any multiple, any multiple value", t => {
  t.deepEqual(
    extract(
      parseParameterizedScopeLiteral("foo:**.(a).b.(c):baz"),
      ["foo:**:baz"].map(parseScopeLiteral)
    ),
    [
      {
        scope: parseScopeLiteral("foo:*.**.b.*:baz"),
        parameters: {
          a: AnySingle,
          c: AnySingle
        }
      }
    ]
  );
});

test("extract(template, scopes) - multiple segments with suffix any multiple, any multiple value", t => {
  t.deepEqual(
    extract(
      parseParameterizedScopeLiteral("foo:(a).b.(c).**:baz"),
      ["foo:**:baz"].map(parseScopeLiteral)
    ),
    [
      {
        scope: parseScopeLiteral("foo:*.b.*.**:baz"),
        parameters: {
          a: AnySingle,
          c: AnySingle
        }
      }
    ]
  );
});

test("extract(template, scopes) - multiple segments with infix any multiple, any multiple value", t => {
  t.deepEqual(
    extract(
      parseParameterizedScopeLiteral("foo:(a).**.(c):baz"),
      ["foo:**:baz"].map(parseScopeLiteral)
    ),
    [
      {
        scope: parseScopeLiteral("foo:*.*.**:baz"),
        parameters: {
          a: AnySingle,
          c: AnySingle
        }
      }
    ]
  );
});

test("extract(template, scopes) - multiple segments with infix any multiple, any single values", t => {
  t.deepEqual(
    extract(
      parseParameterizedScopeLiteral("foo:(a).**.(c):baz"),
      ["foo:*.*.*:baz"].map(parseScopeLiteral)
    ),
    [
      {
        scope: parseScopeLiteral("foo:*.*.*:baz"),
        parameters: {
          a: AnySingle,
          c: AnySingle
        }
      }
    ]
  );
});

test("extract(template, scopes) - multiple segments with surrounding any multiple, any single values", t => {
  t.throws(
    () =>
      extract(
        parseParameterizedScopeLiteral("foo:**.(a).**:baz"),
        ["foo:*.*.*:baz"].map(parseScopeLiteral)
      ),
    InvalidParameterizedScopeError
  );
});
