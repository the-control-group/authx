import test from "ava";
import { extract, InvalidTemplateError } from "./humanizeScopes";

test("single segment, concrete value", t => {
  t.deepEqual(extract("foo:(bar):baz", ["foo:aaa:baz"]), [
    {
      scope: "foo:aaa:baz",
      values: {
        bar: "aaa"
      }
    }
  ]);
});

test("single segment, any single value", t => {
  t.deepEqual(extract("foo:(bar):baz", ["foo:*:baz"]), [
    {
      scope: "foo:*:baz",
      values: {
        bar: "*"
      }
    }
  ]);
});

test("single segment, any multiple value", t => {
  t.deepEqual(extract("foo:(bar):baz", ["foo:**:baz"]), [
    {
      scope: "foo:*:baz",
      values: {
        bar: "*"
      }
    }
  ]);
});

test("multiple segments, any multiple value", t => {
  t.deepEqual(extract("foo:(a).b.(c):baz", ["foo:**:baz"]), [
    {
      scope: "foo:*.b.*:baz",
      values: {
        a: "*",
        c: "*"
      }
    }
  ]);
});

test("multiple segments with prefix any multiple, any multiple value", t => {
  t.deepEqual(extract("foo:**.(a).b.(c):baz", ["foo:**:baz"]), [
    {
      scope: "foo:*.**.b.*:baz",
      values: {
        a: "*",
        c: "*"
      }
    }
  ]);
});

test("multiple segments with suffix any multiple, any multiple value", t => {
  t.deepEqual(extract("foo:(a).b.(c).**:baz", ["foo:**:baz"]), [
    {
      scope: "foo:*.b.*.**:baz",
      values: {
        a: "*",
        c: "*"
      }
    }
  ]);
});

test("multiple segments with infix any multiple, any multiple value", t => {
  t.deepEqual(extract("foo:(a).**.(c):baz", ["foo:**:baz"]), [
    {
      scope: "foo:*.*.**:baz",
      values: {
        a: "*",
        c: "*"
      }
    }
  ]);
});

test("multiple segments with infix any multiple, any single values", t => {
  t.deepEqual(extract("foo:(a).**.(c):baz", ["foo:*.*.*:baz"]), [
    {
      scope: "foo:*.*.*:baz",
      values: {
        a: "*",
        c: "*"
      }
    }
  ]);
});

test("multiple segments with surrounding any multiple, any single values", t => {
  t.throws(
    () => extract("foo:**.(a).**:baz", ["foo:*.*.*:baz"]),
    InvalidTemplateError
  );
});
