
import path from "path";
import HtmlWebpackPlugin from "html-webpack-plugin";
import ForkTsCheckerWebpackPlugin from "fork-ts-checker-webpack-plugin";


const __dirname = path.dirname(new URL(import.meta.url).pathname);

/**
 * Webpack configuration
 * @param {object} env - Environment variables
 * @param {object} argv - Webpack arguments
 * @returns {Configuration} Webpack configuration object
 */
export default (env = {}, argv) => {
  const devMode = argv.mode !== "production";
  return {
    mode: devMode ? "development" : "production",
    entry: {
      app: path.resolve(__dirname, "src/client/index.tsx"),
    },
    // experiments: {
    //   outputModule: true
    // },
    output: {
      // module: true,
      filename: "[name].[contenthash].js",
      // This defaults using process.cwd, which is usually identical but not as
      // stable as __dirname
      path: path.resolve(__dirname, "static"),
      clean: true,
    },
    resolve: {
      // This allows for importing modules from the top level without a bunch of
      // `../../../` etc. modules: [path.resolve(__dirname, "src"),
      // "node_modules"], Required to import .ts and .tsx files
      extensions: [".ts", ".tsx", ".js", ".json"],
      extensionAlias: {
        ".js": [".js", ".ts", ".tsx"],
      },
    },
    watchOptions: {
      ignored: ["**/node_modules"],
    },
    devtool: devMode ? "eval-cheap-module-source-map" : false,
    module: {
      rules: [
        {
          test: /\.tsx?$/,
          exclude: [/node_modules/],
          use: [
            {
              loader: "ts-loader",
            },
          ],
        },
        {
          test: /\.(png|svg|jpg|gif)$/i,
          include: [/images/],
          type: "asset/resource",
        },
        {
          test: /\.(svg)$/i,
          include: [/icons/],
          loader: "raw-loader",
        },
        {
          test: /\.html$/,
          use: [
            {
              loader: "html-loader",
              options: {
                minimize: false,
              },
            },
          ],
        },
      ],
    },
    optimization: {
      moduleIds: "deterministic",
      splitChunks: {
        chunks: "all",
        cacheGroups: {
          // Creates the vendors bundle for better caching
          defaultVendors: {
            enforce: true,
            test: /[\\/]node_modules[\\/]/,
            name: "vendors",
            chunks: "all",
          },
        },
      },
    },
    plugins: [
      new HtmlWebpackPlugin({
        inject: "head",
        template: "src/client/index.html",
      }),
      // This runs the TypeScript typechecking in a separate process from the
      // bundling, greatly increasing build speed
      new ForkTsCheckerWebpackPlugin(),
    ],
  };
};
