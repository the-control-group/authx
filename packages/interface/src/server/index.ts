import { createReadStream, open } from "fs";
import { join, basename, extname } from "path";

export default async (ctx: any, next: () => void) => {
  // Remove any prefix of a koa router.
  const path = ctx._matchedRoute
    ? ctx.request.path.replace(RegExp(`^${ctx._matchedRoute}`), "")
    : ctx.request.path;

  // Don't serve TypeScript definitions or test files.
  if (/\.d\.ts$/.test(path) || /test\.js(\.map)?$/.test(path)) {
    return next();
  }

  // Default to `index.html` if an extension is omitted.
  const filePath = join(
    __dirname,
    "../client/",
    extname(path) ? path : join(path, "index.html")
  );

  // Check to see if the file exists by trying to open a file handler.
  const fd = await new Promise<null | number>((resolve, reject) =>
    open(filePath, "r", (error, fd) => {
      if (error) {
        if (error.code !== "ENOENT") return reject(error);

        return resolve(null);
      }

      resolve(fd);
    })
  );

  // The requested file does not exist.
  if (fd === null) return next();

  // The request uses a directory style, but it missing a trailing slash.
  // Redirect to ensure relative assets will resolve correctly.
  if (!extname(path) && path[path.length - 1] !== "/") {
    ctx.response.redirect(`${ctx.request.path}/${ctx.request.search}`);
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

  // Files that begin with "$" are idempotent and can be cached forever.
  if (basename(path).indexOf("$") === 0) {
    ctx.response.set("Cache-Control", "max-age=2592000, public, idempotent");
  }

  return next();
};
