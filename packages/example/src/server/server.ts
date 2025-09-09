import Koa from "koa";
import serve from "koa-static";
import path from "path";
import send from "koa-send";

const __DEV__ = process.env.NODE_ENV !== "production";
const __dirname = path.dirname(new URL(import.meta.url).pathname);

import { authx } from "./authx.js";

try {
  // Create a Koa app.
  const app = new Koa();
  app.proxy = true;

  // Apply the AuthX routes to the app.
  app.use(authx.routes());

  // Serve the static assets.
  app.use(serve(path.resolve(__dirname, "../../static")));

  // Fall back to index.html.
  app.use(async (ctx, next) => {
    if (ctx.method !== "GET") {
      await next();
      return;
    }

    await send(ctx, "index.html", {
      root: path.resolve(__dirname, "../../static/"),
    });
  });

  // Log errors - everything as JSON makes a happier you.
  app.on(
    "error",
    __DEV__
      ? (error): void => {
          console.error(error);
        }
      : (error): void => {
          if (error.status && error.status < 500)
            console.log(
              JSON.stringify(
                Object.assign({ level: "info", message: error.message }, error),
              ),
            );
          else
            console.error(
              JSON.stringify(
                Object.assign(
                  {
                    level: "error",
                    message: error.message,
                    stack: error.stack,
                  },
                  error,
                ),
              ),
            );
        },
  );

  // Start listening.
  app.listen(process.env.PORT || 80);
} catch (error) {
  console.error(error);
}
