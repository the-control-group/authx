import test from "ava";
import { LocalMemoryRateLimiter } from "./ratelimiter";

test("Rate limiter over rate", async (t) => {
  let curTime = 0;

  const limiter = new LocalMemoryRateLimiter(3, 60 * 1_000, () => {
    curTime += 14_000;
    return curTime;
  });

  limiter.limit("A");
  limiter.limit("B");
  limiter.limit("C");
  limiter.limit("A");
  limiter.limit("B");
  limiter.limit("C");
  limiter.limit("A");
  limiter.limit("B");
  limiter.limit("C");

  limiter.limit("A");
  limiter.limit("A");
  limiter.limit("A");

  try {
    limiter.limit("A");
    t.fail("4th call in the same minute should cause 429");
  } catch (ex) {
    t.assert(ex?.message === `Too many requests for key 'A'.`);
    t.pass();
  }
});
