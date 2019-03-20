// eslint-disable-next-line @typescript-eslint/no-var-requires
const { createReadStream, open } = require("fs");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { join, basename, extname } = require("path");

module.exports = async (ctx, next) => {
  // Remove any prefix of a koa router
  const path = ctx._matchedRoute
    ? ctx.request.path.replace(RegExp(`^${ctx._matchedRoute}`), "")
    : ctx.request.path;

  // Default to `index.html` if an extension is omitted
  const filePath = join(
    __dirname,
    "dist",
    extname(path) ? path : join(path, "index.html")
  );

  // Check to see if the file exists by trying to open a file handler
  const fd = await new Promise((resolve, reject) =>
    open(filePath, (error, fd) => {
      if (error) {
        if (error.code !== "ENOENT") return reject(error);

        return resolve(null);
      }

      resolve(fd);
    })
  );

  // The requested file does not exist.
  if (fd === null) return next();

  // The request uses a directory style, bue it missing a trailing slash.
  // Redirect to ensure relative assets will resolve correctly.
  if (!extname(path) && path[path.length - 1] !== "/") {
    ctx.response.redirect(ctx.request.path + "/");
    return next();
  }

  ctx.response.body = createReadStream(filePath, { fd });

  // Set content types.
  switch (extname(path)) {
    case "":
      ctx.response.set("Content-Type", "text/html; charset=utf-8");
      break;
    case ".html":
      ctx.response.set("Content-Type", "text/html; charset=utf-8");
      break;
    case ".js":
      ctx.response.set(
        "Content-Type",
        "application/javascript'; charset=utf-8"
      );
      break;
  }

  // files that begin with "$" are idempotent and can be cached forever
  if (basename(path).indexOf("_") === 0) {
    ctx.response.set("Cache-Control", "max-age=2592000, public, idempotent");
  }
  return next();
};
