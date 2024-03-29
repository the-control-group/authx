import { registerHooks } from "../../util.js";
import { fileURLToPath } from "url";
import {
  ClientAction,
  ClientContext,
  createV2AuthXScope,
} from "@authx/authx/dist/util/scopes.js";
import { pagingTests } from "./generic.js";

const ctx = registerHooks(fileURLToPath(import.meta.url));

function createReadScope(clientId: string): string {
  const action: ClientAction = {
    basic: "r",
    secrets: "",
  };

  const context: ClientContext = {
    type: "client",
    clientId: clientId,
  };

  const scope = createV2AuthXScope("authx", context, action);

  return scope;
}

pagingTests({
  testName: "by client ID",
  entityType: "client",
  ids: [
    "17436d83-6022-4101-bf9f-997f1550f57c",
    "702d2103-a1b3-4873-b36b-dc8823fe95d1",
  ],
  scopes: [
    createReadScope("17436d83-6022-4101-bf9f-997f1550f57c"),
    createReadScope("702d2103-a1b3-4873-b36b-dc8823fe95d1"),
  ],
  ctx: ctx,
});
