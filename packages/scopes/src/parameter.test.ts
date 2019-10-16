import test from "ava";
import { extract, InvalidTemplateError } from "./parameter";

test("extract(template, scopes) - single segment, concrete value", t => {
  t.deepEqual(extract("foo:(bar):baz", ["foo:aaa:baz"]), [
    {
      scope: "foo:aaa:baz",
      parameters: {
        bar: "aaa"
      }
    }
  ]);
});

test("extract(template, scopes) - single segment, any single value", t => {
  t.deepEqual(extract("foo:(bar):baz", ["foo:*:baz"]), [
    {
      scope: "foo:*:baz",
      parameters: {
        bar: "*"
      }
    }
  ]);
});

test("extract(template, scopes) - single segment, any multiple value", t => {
  t.deepEqual(extract("foo:(bar):baz", ["foo:**:baz"]), [
    {
      scope: "foo:*:baz",
      parameters: {
        bar: "*"
      }
    }
  ]);
});

test("extract(template, scopes) - multiple segments, any multiple value", t => {
  t.deepEqual(extract("foo:(a).b.(c):baz", ["foo:**:baz"]), [
    {
      scope: "foo:*.b.*:baz",
      parameters: {
        a: "*",
        c: "*"
      }
    }
  ]);
});

test("extract(template, scopes) - multiple segments with prefix any multiple, any multiple value", t => {
  t.deepEqual(extract("foo:**.(a).b.(c):baz", ["foo:**:baz"]), [
    {
      scope: "foo:*.**.b.*:baz",
      parameters: {
        a: "*",
        c: "*"
      }
    }
  ]);
});

test("extract(template, scopes) - multiple segments with suffix any multiple, any multiple value", t => {
  t.deepEqual(extract("foo:(a).b.(c).**:baz", ["foo:**:baz"]), [
    {
      scope: "foo:*.b.*.**:baz",
      parameters: {
        a: "*",
        c: "*"
      }
    }
  ]);
});

test("extract(template, scopes) - multiple segments with infix any multiple, any multiple value", t => {
  t.deepEqual(extract("foo:(a).**.(c):baz", ["foo:**:baz"]), [
    {
      scope: "foo:*.*.**:baz",
      parameters: {
        a: "*",
        c: "*"
      }
    }
  ]);
});

test("extract(template, scopes) - multiple segments with infix any multiple, any single values", t => {
  t.deepEqual(extract("foo:(a).**.(c):baz", ["foo:*.*.*:baz"]), [
    {
      scope: "foo:*.*.*:baz",
      parameters: {
        a: "*",
        c: "*"
      }
    }
  ]);
});

test("extract(template, scopes) - multiple segments with surrounding any multiple, any single values", t => {
  t.throws(
    () => extract("foo:**.(a).**:baz", ["foo:*.*.*:baz"]),
    InvalidTemplateError
  );
});
