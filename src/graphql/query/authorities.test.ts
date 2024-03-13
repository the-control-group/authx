import { registerHooks } from "../../util.js";
import { pagingTests } from "./generic.js";
import { fileURLToPath } from "url";

const ctx = registerHooks(fileURLToPath(import.meta.url));

pagingTests({
  testName: "by authority ID",
  entityType: "authority",
  endpointName: "authorities",
  ids: [
    "0d765613-e813-40e5-9aa7-89f96531364e",
    "725f9c3b-4a72-4021-9066-c89e534df5be",
  ],
  scopes: [],
  ctx: ctx,
  public: true,
});
