#!/usr/bin/env node

import bootstrap from "./scripts/bootstrap.js";
import fixture from "./scripts/fixture.js";
import schema from "./scripts/schema.js";

(async () => {
  switch (process.argv[2]) {
    case "bootstrap":
      await bootstrap();
      return;
    case "fixture":
      if (process.argv.length !== 5) {
        throw new Error(
          "You must specify the path to the private and public keys.",
        );
      }

      await fixture(process.argv[3], process.argv[4]);
      return;
    case "schema":
      await schema();
      return;
    default:
      throw new Error(`You must specify one of the following actions:
  - bootstrap
  - fixture <path/to/private.pem> <path/to/public.pem>
  - schema.`);
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
