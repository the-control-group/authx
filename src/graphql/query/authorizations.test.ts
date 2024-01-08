import { registerHooks } from "../../util.js";
import { pagingTests } from "./generic.js";
import { fileURLToPath } from "url";
import {
  AuthorizationAction,
  AuthorizationContext,
  createV2AuthXScope,
} from "@authx/authx/dist/util/scopes.js";

const ctx = registerHooks(fileURLToPath(import.meta.url));

function createReadScope(
  authorizationId: string,
  clientId: string,
  grantId: string,
  userId: string,
): string {
  const action: AuthorizationAction = {
    basic: "r",
    scopes: "",
    secrets: "",
  };

  const context: AuthorizationContext = {
    type: "authorization",
    authorizationId: authorizationId,
    clientId: clientId,
    grantId: grantId,
    userId: userId,
  };

  const scope = createV2AuthXScope("authx", context, action);

  return scope;
}

pagingTests({
  testName: "by authorization ID",
  entityType: "authorization",
  ids: [
    "5387ece5-37a1-4573-a189-14333ebf8d88",
    "f0e54748-c7bb-4724-ad8b-7dabb66aafa9",
    null,
  ],
  scopes: [
    createReadScope("5387ece5-37a1-4573-a189-14333ebf8d88", "*", "*", "*"),
    createReadScope("f0e54748-c7bb-4724-ad8b-7dabb66aafa9", "*", "*", "*"),
  ],
  ctx: ctx,
});

pagingTests({
  testName: "by user ID",
  entityType: "authorization",
  ids: [
    "5387ece5-37a1-4573-a189-14333ebf8d88",
    "f0e54748-c7bb-4724-ad8b-7dabb66aafa9",
    null,
  ],
  scopes: [
    createReadScope("*", "*", "*", "e165cbb0-86b0-4e11-9db7-eb5f742161b8"),
    createReadScope("*", "*", "*", "51192909-3664-44d5-be62-c6b45f0b0ee6"),
  ],
  ctx: ctx,
});

pagingTests({
  testName: "by grant ID",
  entityType: "authorization",
  ids: [
    "5387ece5-37a1-4573-a189-14333ebf8d88",
    "f0e54748-c7bb-4724-ad8b-7dabb66aafa9",
    null,
  ],
  scopes: [
    createReadScope("*", "*", "d8dcaf12-b744-4d2d-b223-09e7e5eaa922", "*"),
    createReadScope("*", "*", "4e76cb13-ab24-4dc1-ad96-abcbb89f5529", "*"),
  ],
  ctx: ctx,
});

pagingTests({
  testName: "by client ID with wildcards",
  entityType: "authorization",
  ids: ["5387ece5-37a1-4573-a189-14333ebf8d88", null],
  scopes: [
    createReadScope("*", "1fcb730e-f134-463a-b224-cab7e61c5ce0", "*", "*"),
  ],
  ctx: ctx,
});

pagingTests({
  testName: "by client ID",
  entityType: "authorization",
  ids: ["5387ece5-37a1-4573-a189-14333ebf8d88", null],
  scopes: [
    "authx:v2.authorization.*.5387ece5-37a1-4573-a189-14333ebf8d88.**:r....",
  ],
  ctx: ctx,
});

pagingTests({
  testName: "by grant and client ID",
  entityType: "authorization",
  ids: ["5387ece5-37a1-4573-a189-14333ebf8d88", null],
  scopes: [
    createReadScope(
      "*",
      "1fcb730e-f134-463a-b224-cab7e61c5ce0",
      "d8dcaf12-b744-4d2d-b223-09e7e5eaa922",
      "*",
    ),
    createReadScope(
      "*",
      "1fcb730e-f134-463a-b224-cab7e61c5ce0",
      "4e76cb13-ab24-4dc1-ad96-abcbb89f5529",
      "*",
    ),
  ],
  ctx: ctx,
});
