import Koa from "koa";
import AuthX from ".";
import authXInterface from "authx-interface";

import email from "./strategy/email";
import password from "./strategy/password";

const config = {};

const __DEV__ = process.env.NODE_ENV !== "production";

// create a Koa app
const app = new Koa();
app.proxy = true;

// add the AuthX user interface
app.use(authXInterface);

// create a new instanciate of AuthX
const authx = new AuthX(config, [email, password]);

// apply the AuthX routes to the app
app.use(authx.routes());

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
