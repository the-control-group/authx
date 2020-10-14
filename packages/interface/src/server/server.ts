import Koa from "koa";
import createInterfaceMiddleware from ".";

(async () => {
  const app = new Koa();
  const interfaceMiddleware = await createInterfaceMiddleware("authx", [
    "@authx/strategy-email/client",
    "@authx/strategy-password/client",
  ]);
  app.use(interfaceMiddleware);
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
})();
