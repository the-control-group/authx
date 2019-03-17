import {resolve} from "path";
import Koa from "koa";
import send from "koa-send";
import AuthX from ".";

import password from "./strategies/password";

const config = {};

const __DEV__ = process.env.NODE_ENV !== "production";

// create a Koa app
const app = new Koa();
app.proxy = true;

// create a new instanciate of AuthX
const authx = new AuthX(config, [password]);

// apply the AuthX routes to the app
app.use(authx.routes());

// add public files
const root = resolve(__dirname, "../public");
app.use(async (ctx) => {
  await send(ctx, ctx.path, { root });
})

// log errors - everything as JSON makes a happier you
app.on(
  "error",
  __DEV__
    ? error => {
        console.error(error);
      }
    : error => {
        if (error.status && error.status < 500)
          console.log(
            JSON.stringify(
              Object.assign({ level: "info", message: error.message }, error)
            )
          );
        else
          console.error(
            JSON.stringify(
              Object.assign(
                { level: "error", message: error.message, stack: error.stack },
                error
              )
            )
          );
      }
);

// start listening
app.listen(process.env.PORT || 3000);
