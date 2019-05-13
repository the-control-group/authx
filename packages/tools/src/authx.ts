#!/usr/bin/env node

import bootstrap from "./scripts/bootstrap";
import fixture from "./scripts/fixture";
import schema from "./scripts/schema";

(async () => {
  switch (process.argv[2]) {
    case "bootstrap":
      await bootstrap();
      return;
    case "fixture":
      await fixture();
      return;
    case "schema":
      await schema();
      return;
    default:
      console.error(
        `You must specify one of the following actions:
  bootstrap
  fixture
  schema.`
      );
      process.exit(1);
  }
})().catch(error => {
  console.error(error);
  process.exit(1);
});
