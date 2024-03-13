import { registerHooks } from "../../util.js";
import { pagingTests } from "./generic.js";
import { fileURLToPath } from "url";
import {
  createV2AuthXScope,
  GrantAction,
  GrantContext,
} from "@authx/authx/dist/util/scopes.js";

const ctx = registerHooks(fileURLToPath(import.meta.url));

function createReadScope(
  clientId: string,
  grantId: string,
  userId: string,
): string {
  const action: GrantAction = {
    basic: "r",
    scopes: "",
    secrets: "",
  };

  const context: GrantContext = {
    type: "grant",
    clientId: clientId,
    grantId: grantId,
    userId: userId,
  };

  return createV2AuthXScope("authx", context, action);
}

pagingTests({
  testName: "by grant ID",
  entityType: "grant",
  ids: [
    "e4670762-beb7-435c-94af-055b951f97e6",
    "4e76cb13-ab24-4dc1-ad96-abcbb89f5529",
  ].sort(),
  scopes: [
    createReadScope("*", "e4670762-beb7-435c-94af-055b951f97e6", "*"),
    createReadScope("*", "4e76cb13-ab24-4dc1-ad96-abcbb89f5529", "*"),
  ],
  ctx: ctx,
});

pagingTests({
  testName: "by user ID",
  entityType: "grant",
  ids: [
    "e4670762-beb7-435c-94af-055b951f97e6",
    "4e76cb13-ab24-4dc1-ad96-abcbb89f5529",
  ].sort(),
  scopes: [
    createReadScope("*", "*", "a6a0946d-eeb4-45cd-83c6-c7920f2272eb"),
    createReadScope("*", "*", "51192909-3664-44d5-be62-c6b45f0b0ee6"),
  ],
  ctx: ctx,
});

pagingTests({
  testName: "by client ID",
  entityType: "grant",
  ids: [
    "e4670762-beb7-435c-94af-055b951f97e6",
    "4e76cb13-ab24-4dc1-ad96-abcbb89f5529",
  ].sort(),
  scopes: [createReadScope("17436d83-6022-4101-bf9f-997f1550f57c", "*", "*")],
  ctx: ctx,
});
