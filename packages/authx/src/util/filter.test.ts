import test from "ava";
import { filter } from "./filter.js";

test("Async filter.", async (t) => {
  t.deepEqual(
    await filter([1, 1, 2, 1], (x) => Promise.resolve(x < 2)),
    [1, 1, 1]
  );
});
