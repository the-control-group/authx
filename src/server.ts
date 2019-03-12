import path from "path";
import Koa from "koa";
import send from "koa-send";
import AuthX from ".";

const config = {};
const root = path.join(__dirname, "public");

// create a Koa app
const app = new Koa();
app.proxy = true;

// create a new instanciate of AuthX
const authx = new AuthX(config);

// apply the AuthX routes to the app
app.use(authx.routes());

// log errors - everything as JSON makes a happier you
app.on("error", err => {
  if (err.status && err.status < 500)
    console.log(
      JSON.stringify(
        Object.assign({ level: "info", message: err.message }, err)
      )
    );
  else
    console.error(
      JSON.stringify(
        Object.assign(
          { level: "error", message: err.message, stack: err.stack },
          err
        )
      )
    );
});

// start listening
app.listen(process.env.PORT || 3000);
