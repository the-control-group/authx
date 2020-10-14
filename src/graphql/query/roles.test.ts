import { registerHooks } from "../../util";
import { pagingTests } from "./generic";
import {
  createV2AuthXScope,
  RoleAction,
  RoleContext,
} from "@authx/authx/dist/util/scopes";

const ctx = registerHooks(__filename);

function createReadScope(roleId: string): string {
  const action: RoleAction = {
    basic: "r",
    scopes: "",
    users: "",
  };

  const context: RoleContext = {
    type: "role",
    roleId: roleId,
  };

  return createV2AuthXScope("authx", context, action);
}

pagingTests({
  testName: "by role ID",
  entityType: "role",
  ids: [
    "ee37605c-5834-40c9-bd80-bac16d9e62a4",
    "e833c8b8-acf1-42a1-9809-2bedab7d58c7",
    "e3e67ba0-626a-4fb6-ad86-6520d4acfaf6",
    "08e2b39e-ba9f-4de2-8dca-aef460793566",
  ].sort(),
  scopes: [
    createReadScope("ee37605c-5834-40c9-bd80-bac16d9e62a4"),
    createReadScope("e833c8b8-acf1-42a1-9809-2bedab7d58c7"),
    createReadScope("e3e67ba0-626a-4fb6-ad86-6520d4acfaf6"),
    createReadScope("08e2b39e-ba9f-4de2-8dca-aef460793566"),
  ],
  ctx: ctx,
});
