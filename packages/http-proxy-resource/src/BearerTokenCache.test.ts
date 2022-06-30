import test from "ava";
import { BearerTokenCache, FetchFunction } from "./BearerTokenCache";

function createFetchFunc(conf: {
  numCalls: number;
  changeTokenOnSecondCall?: boolean;
  useOriginalToken?: boolean;
  throwErrorOnCalls?: number[];
}): FetchFunction {
  return async (uri, fetchConf) => {
    conf.numCalls++;
    return {
      status: 200,
      json: async () => {
        if (conf.throwErrorOnCalls?.includes(conf.numCalls)) {
          throw new Error();
        }
        if (conf.useOriginalToken) {
          return {
            data: {
              viewer: {
                token: fetchConf.headers.Authorization.replace(
                  "BASIC ",
                  "BEARER 22"
                ),
              },
            },
          };
        }
        if (conf.numCalls == 2 && conf.changeTokenOnSecondCall) {
          return { data: { viewer: { token: "BEARER 567" } } };
        }
        return { data: { viewer: { token: "BEARER 123" } } };
      },
    };
  };
}

function shortPause() {
  return new Promise<void>((res, rej) => {
    setTimeout(res, 0);
  });
}

const defaultConfig = {
  authxUrl: "",
  tokenExpirySeconds: 60,
  tokenRefreshSeconds: 30,
};

test("successful call", async (t) => {
  let time = 1000;
  const fetchFuncConf = {
    numCalls: 0,
  };

  const cache = new BearerTokenCache({
    ...defaultConfig,
    fetchFunc: createFetchFunc(fetchFuncConf),
    timeSource: () => time,
  });

  t.deepEqual(await cache.getBearerToken("BASIC abc"), "BEARER 123");
});

test("successful pair of calls to test caching", async (t) => {
  let time = 1000;
  const fetchFuncConf = {
    numCalls: 0,
  };

  const cache = new BearerTokenCache({
    ...defaultConfig,
    fetchFunc: createFetchFunc(fetchFuncConf),
    timeSource: () => time,
  });

  for (let i = 0; i < 2; ++i) {
    t.deepEqual(await cache.getBearerToken("BASIC abc"), "BEARER 123");
  }
  t.deepEqual(fetchFuncConf.numCalls, 1);
});

test("successful pair of calls 90 seconds apart", async (t) => {
  let time = 1000;
  const fetchFuncConf = {
    numCalls: 0,
  };

  const cache = new BearerTokenCache({
    ...defaultConfig,
    fetchFunc: createFetchFunc(fetchFuncConf),
    timeSource: () => time,
  });

  for (let i = 0; i < 2; ++i) {
    t.deepEqual(await cache.getBearerToken("BASIC abc"), "BEARER 123");
    time += 90_000;
  }
  t.deepEqual(fetchFuncConf.numCalls, 2);
});

test("successful pair of calls 40 seconds apart", async (t) => {
  let time = 1000;
  const fetchFuncConf = {
    numCalls: 0,
    changeTokenOnSecondCall: true,
  };

  const cache = new BearerTokenCache({
    ...defaultConfig,
    fetchFunc: createFetchFunc(fetchFuncConf),
    timeSource: () => time,
  });

  t.deepEqual(await cache.getBearerToken("BASIC abc"), "BEARER 123");
  time += 40_000;

  t.deepEqual(await cache.getBearerToken("BASIC abc"), "BEARER 123");
  time += 5_000;

  t.deepEqual(fetchFuncConf.numCalls, 2);
  await shortPause();
  t.deepEqual(await cache.getBearerToken("BASIC abc"), "BEARER 567");

  t.deepEqual(fetchFuncConf.numCalls, 2);
});

test("successful pair of calls to different keys", async (t) => {
  let time = 1000;
  const fetchFuncConf = {
    numCalls: 0,
    useOriginalToken: true,
  };

  const cache = new BearerTokenCache({
    ...defaultConfig,
    fetchFunc: createFetchFunc(fetchFuncConf),
    timeSource: () => time,
  });

  t.deepEqual(await cache.getBearerToken("BASIC xyz"), "BEARER 22xyz");
  t.deepEqual(await cache.getBearerToken("BASIC efg"), "BEARER 22efg");
});

test("error calling authx", async (t) => {
  let time = 1000;
  const fetchFuncConf = {
    numCalls: 0,
    throwErrorOnCalls: [1],
  };

  const cache = new BearerTokenCache({
    ...defaultConfig,
    fetchFunc: createFetchFunc(fetchFuncConf),
    timeSource: () => time,
  });

  let numErrors = 0;
  cache.on("error", () => numErrors++);

  try {
    await cache.getBearerToken("BASIC xyz");
    t.fail();
  } catch (ex) {
    t.deepEqual(numErrors, 1);
    t.assert(true);
  }
});

test("reuses token on failure if NOT expired", async (t) => {
  let time = 1000;
  const fetchFuncConf = {
    numCalls: 0,
    throwErrorOnCalls: [2, 3],
  };

  const cache = new BearerTokenCache({
    ...defaultConfig,
    fetchFunc: createFetchFunc(fetchFuncConf),
    timeSource: () => time,
  });

  let numWarnings = 0;
  cache.on("error", () => numWarnings++);

  t.deepEqual(await cache.getBearerToken("BASIC xyz"), "BEARER 123");
  t.deepEqual(numWarnings, 0);

  time += 35_000;

  t.deepEqual(await cache.getBearerToken("BASIC xyz"), "BEARER 123");
  await shortPause();
  t.deepEqual(numWarnings, 1);

  time += 35_000;

  try {
    await cache.getBearerToken("BASIC xyz");
    t.fail();
  } catch (ex) {
    t.deepEqual(numWarnings, 2);
    t.assert(true);
  }
});
