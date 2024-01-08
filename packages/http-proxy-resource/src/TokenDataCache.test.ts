import test from "ava";
import { TokenDataCache, FetchFunction, TokenData } from "./TokenDataCache.js";

const FIRST_TOKEN = { access: ["test:r:r"], id: "I1", user: { id: "U1" } };
const SECOND_TOKEN = { access: ["test2:r:r"], id: "I5", user: { id: "U5" } };

function createFetchFunc(conf: {
  numCalls: number;
  changeTokenOnSecondCall?: boolean;
  useOriginalToken?: boolean;
  throwErrorOnCalls?: number[];
  overrideStatusCodes?: (number | null)[];
  overrideTokenData?: (TokenData | null | {})[];
}): FetchFunction {
  return async (uri, fetchConf) => {
    conf.numCalls++;

    return {
      status: conf?.overrideStatusCodes?.[conf.numCalls - 1] ?? 200,
      json: async () => {
        if (conf?.overrideTokenData?.[conf.numCalls - 1]) {
          return {
            data: { viewer: conf?.overrideTokenData?.[conf.numCalls - 1] },
          };
        }

        if (conf.throwErrorOnCalls?.includes(conf.numCalls)) {
          throw new Error();
        }
        if (conf.useOriginalToken) {
          return {
            data: {
              viewer: {
                id: fetchConf.headers.Authorization.replace(
                  "BASIC ",
                  "BEARER 22",
                ),
                access: ["a"],
                user: { id: "B" },
              },
            },
          };
        }
        if (conf.numCalls == 2 && conf.changeTokenOnSecondCall) {
          return { data: { viewer: SECOND_TOKEN } };
        }
        return { data: { viewer: FIRST_TOKEN } };
      },
    };
  };
}

function shortPause(): Promise<void> {
  return new Promise<void>((res) => {
    setTimeout(res, 0);
  });
}

const defaultConfig = {
  authxUrl: "",
  tokenExpirySeconds: 60,
  tokenRefreshSeconds: 30,
};

test("successful call", async (t) => {
  const time = 1000;
  const fetchFuncConf = {
    numCalls: 0,
  };

  const cache = new TokenDataCache({
    ...defaultConfig,
    fetchFunc: createFetchFunc(fetchFuncConf),
    timeSource: () => time,
  });

  t.deepEqual(await cache.getToken("BASIC abc"), FIRST_TOKEN);
});

test("successful pair of calls to test caching", async (t) => {
  const time = 1000;
  const fetchFuncConf = {
    numCalls: 0,
  };

  const cache = new TokenDataCache({
    ...defaultConfig,
    fetchFunc: createFetchFunc(fetchFuncConf),
    timeSource: () => time,
  });

  for (let i = 0; i < 2; ++i) {
    t.deepEqual(await cache.getToken("BASIC abc"), FIRST_TOKEN);
  }
  t.deepEqual(fetchFuncConf.numCalls, 1);
});

test("successful pair of calls 90 seconds apart", async (t) => {
  let time = 1000;
  const fetchFuncConf = {
    numCalls: 0,
  };

  const cache = new TokenDataCache({
    ...defaultConfig,
    fetchFunc: createFetchFunc(fetchFuncConf),
    timeSource: () => time,
  });

  for (let i = 0; i < 2; ++i) {
    t.deepEqual(await cache.getToken("BASIC abc"), FIRST_TOKEN);
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

  const cache = new TokenDataCache({
    ...defaultConfig,
    fetchFunc: createFetchFunc(fetchFuncConf),
    timeSource: () => time,
  });

  t.deepEqual(await cache.getToken("BASIC abc"), FIRST_TOKEN);
  time += 40_000;

  t.deepEqual(await cache.getToken("BASIC abc"), FIRST_TOKEN);
  time += 5_000;

  t.deepEqual(fetchFuncConf.numCalls, 2);
  await shortPause();
  t.deepEqual(await cache.getToken("BASIC abc"), SECOND_TOKEN);

  t.deepEqual(fetchFuncConf.numCalls, 2);
});

test("successful pair of calls to different keys", async (t) => {
  const time = 1000;
  const fetchFuncConf = {
    numCalls: 0,
    useOriginalToken: true,
  };

  const cache = new TokenDataCache({
    ...defaultConfig,
    fetchFunc: createFetchFunc(fetchFuncConf),
    timeSource: () => time,
  });

  t.deepEqual((await cache.getToken("BASIC xyz")).id, "BEARER 22xyz");
  t.deepEqual((await cache.getToken("BASIC efg")).id, "BEARER 22efg");
});

test("error calling authx", async (t) => {
  const time = 1000;
  const fetchFuncConf = {
    numCalls: 0,
    throwErrorOnCalls: [1],
  };

  const cache = new TokenDataCache({
    ...defaultConfig,
    fetchFunc: createFetchFunc(fetchFuncConf),
    timeSource: () => time,
  });

  let numErrors = 0;
  cache.on("error", () => numErrors++);

  try {
    await cache.getToken("BASIC xyz");
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

  const cache = new TokenDataCache({
    ...defaultConfig,
    fetchFunc: createFetchFunc(fetchFuncConf),
    timeSource: () => time,
  });

  let numWarnings = 0;
  cache.on("error", () => numWarnings++);

  t.deepEqual(await cache.getToken("BASIC xyz"), FIRST_TOKEN);
  t.deepEqual(numWarnings, 0);

  time += 35_000;

  t.deepEqual(await cache.getToken("BASIC xyz"), FIRST_TOKEN);
  await shortPause();
  t.deepEqual(numWarnings, 1);

  time += 35_000;

  try {
    await cache.getToken("BASIC xyz");
    t.fail();
  } catch (ex) {
    t.deepEqual(numWarnings, 2);
    t.assert(true);
  }
});

test("successful first call but revoke on 401", async (t) => {
  let time = 1000;
  const fetchFuncConf = {
    numCalls: 0,
    overrideStatusCodes: [null, 401],
    overrideTokenData: [null, {}],
  };

  const cache = new TokenDataCache({
    ...defaultConfig,
    fetchFunc: createFetchFunc(fetchFuncConf),
    timeSource: () => time,
  });

  let numErrors = 0;
  cache.on("error", () => numErrors++);

  t.deepEqual(await cache.getToken("BASIC abc"), FIRST_TOKEN);
  time += 35_000;
  t.deepEqual(await cache.getToken("BASIC abc"), FIRST_TOKEN);
  await shortPause();
  time += 1_000;
  try {
    await cache.getToken("BASIC abc");
    t.fail();
  } catch (ex) {
    t.deepEqual(numErrors, 0);
    t.assert(true);
  }
});

test("successful first call but revoke on blank access", async (t) => {
  let time = 1000;
  const fetchFuncConf = {
    numCalls: 0,
    overrideTokenData: [null, { ...FIRST_TOKEN, access: [] }],
  };

  const cache = new TokenDataCache({
    ...defaultConfig,
    fetchFunc: createFetchFunc(fetchFuncConf),
    timeSource: () => time,
  });

  t.deepEqual(await cache.getToken("BASIC abc"), FIRST_TOKEN);
  time += 35_000;
  t.deepEqual(await cache.getToken("BASIC abc"), FIRST_TOKEN);
  await shortPause();
  time += 1_000;
  t.deepEqual(await cache.getToken("BASIC abc"), {
    ...FIRST_TOKEN,
    access: [],
  });
});
