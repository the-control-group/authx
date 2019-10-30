import test from "ava";
import { generateScopeTables } from "./generateScopeTables";
import generateScopeConfigs from "../scopes";

import { writeFileSync } from "fs";
import { join } from "path";
import md from "markdown-table";

test("basic equal", t => {
  const results = generateScopeTables(generateScopeConfigs({ authx: "AuthX" }));

  writeFileSync(
    join(__dirname, "scopes.md"),
    md(
      results[0].table.map((r, ri) =>
        r.map((c, ci) => (ri && ci ? c : "`" + c + "`"))
      )
    )
  );

  t.deepEqual(results, []);
});
