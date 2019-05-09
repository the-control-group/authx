import Koa from "koa";
import middleware from ".";

const app = new Koa();
app.use(middleware);
const server = app.listen(
  (process.env.PORT && parseInt(process.env.PORT)) || undefined,
  () => {
    const address = server.address();
    console.log(
      `HTTP server listening on ${
        !address
          ? ""
          : typeof address === "string"
          ? address
          : `http://localhost:${address.port}.`
      }`
    );
  }
);
