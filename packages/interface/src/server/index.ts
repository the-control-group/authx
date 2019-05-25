import { join, basename, extname } from "path";
import MemoryFileSystem from "memory-fs";
import HtmlWebpackPlugin from "html-webpack-plugin";
import webpack from "webpack";

export default function createInterface(
  strategies: ReadonlyArray<string>
): (ctx: any, next: () => void) => void {
  const fs = new MemoryFileSystem();

  // Create a webpack compiler.
  const compiler = webpack({
    target: "web",
    mode: "development",
    entry: [join(__dirname, "../client/index.js")],
    output: {
      filename: "authx-[contenthash].js",
      chunkFilename: "authx-[id]-[contenthash].js",
      path: join(__dirname, "../client")
    },
    devtool: "source-map",
    resolve: {
      extensions: [".js", ".json"]
    },
    module: {
      rules: [
        {
          test: join(__dirname, "../client/index.js"),
          loader: join(__dirname, "loader.js"),
          options: {
            strategies
          }
        }
      ]
    },
    plugins: [
      new HtmlWebpackPlugin({
        template: join(__dirname, "../client/index.html"),
        filename: "index.html"
      })
    ]
  });

  // Output directly to memory.
  compiler.outputFileSystem = fs;

  //
  compiler.run((err, stats) => {
    if (err || stats.hasErrors()) {
      console.error("ERROR", err);
    }

    // done processing
    console.log(stats.compilation.errors);

    console.log(
      fs.readdirSync(
        join("/Users/mike/Code/authx/packages/interface/dist/client")
      )
    );
  });

  return async (ctx: any, next: () => void) => {
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

    // The requested file does not exist.
    if (!fs.existsSync(filePath)) return next();

    // The request uses a directory style, but it missing a trailing slash.
    // Redirect to ensure relative assets will resolve correctly.
    if (!extname(path) && path[path.length - 1] !== "/") {
      ctx.response.redirect(`${ctx.request.path}/${ctx.request.search}`);
      return next();
    }

    ctx.response.body = fs.readFileSync(filePath);

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
}
