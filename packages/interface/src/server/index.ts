import { join, basename, extname } from "path";
import { fileURLToPath } from "url";
import MemoryFileSystem from "memory-fs";
import HtmlWebpackPlugin from "html-webpack-plugin";
import webpack from "webpack";

const { DefinePlugin } = webpack;

class BuildError extends Error {
  public errors: ReadonlyArray<string | Error> = [];
}

const __dirname = fileURLToPath(new URL('.', import.meta.url));

export default async function createInterface(
  realm: string,
  strategies: ReadonlyArray<string>
): Promise<(ctx: any, next: () => Promise<any>) => Promise<any>> {
  const fs = new MemoryFileSystem();

  // Create a webpack compiler.
  const compiler = webpack({
    target: "web",
    mode: "development",
    entry: [join(__dirname, "../client/index.js")],
    output: {
      filename: "$authx-[contenthash].js",
      chunkFilename: "$authx-[id]-[contenthash].js",
      path: join(__dirname, "../client"),
    },
    devtool: "source-map",
    resolve: {
      extensions: [".js", ".json"],
    },
    module: {
      rules: [
        {
          test: /\.js$/,
          use: ["source-map-loader"],
          enforce: "pre",
        },
        {
          test: join(__dirname, "../client/index.js"),
          loader: join(__dirname, "loader.js"),
          options: {
            strategies,
          },
        },
      ],
    },
    plugins: [
      new DefinePlugin({
        __REALM__: JSON.stringify(realm),
      }),
      new HtmlWebpackPlugin({
        template: join(__dirname, "../client/index.html"),
        filename: "index.html",
      }),
    ],
  });

  // FIXME: While the code is compatible here, the types are not (allowing
  // err to be undefined). This should hopefully be fixed very soon, and if you
  // are reading this, you should try removing the cast through any.

  compiler.intermediateFileSystem = fs as any;
  compiler.outputFileSystem = fs as any;

  // Wait for the build.
  await new Promise<void>((resolve, reject) => {
    compiler.run((error, stats) => {
      if (error) {
        return reject(error);
      }

      if (!stats) {
        return reject(new Error("Webpack stats cannot be undefined."));
      }

      if (stats.hasErrors()) {
        const error = new BuildError("Failed to build bundle.");
        error.errors = stats.compilation.errors;
        return reject(error);
      }

      resolve();
    });
  });

  return (ctx: any, next: () => Promise<any>) => {
    // Remove any prefix of a koa router.
    const path = decodeURIComponent(
      ctx._matchedRoute
        ? ctx.request.path.replace(RegExp(`^${ctx._matchedRoute}`), "")
        : ctx.request.path
    );

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
