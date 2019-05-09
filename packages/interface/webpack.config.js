/* eslint-disable @typescript-eslint/no-var-requires */
const glob = require("glob");
const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");

const __DEV__ = process.env.NODE_ENV !== "production";

module.exports = [
  {
    target: "web",
    mode: __DEV__ ? "development" : "production",
    entry: ["./src/client/index.tsx"],
    output: {
      filename: "$authenticate-[contenthash].js",
      chunkFilename: "$authenticate-[id]-[contenthash].js",
      path: __dirname + "/dist/client"
    },
    devtool: "source-map",
    resolve: {
      extensions: [".ts", ".tsx", ".js", ".json"]
    },
    module: {
      rules: [
        // All files with a '.ts' or '.tsx' extension will be handled by
        // 'awesome-typescript-loader'.
        { test: /\.tsx?$/, loader: "awesome-typescript-loader" },

        // All output '.js' files will have any sourcemaps re-processed by
        // 'source-map-loader'.
        { enforce: "pre", test: /\.js$/, loader: "source-map-loader" }
      ]
    },
    plugins: [
      new HtmlWebpackPlugin({
        template: path.join(__dirname, "src/client/index.html"),
        filename: "index.html"
      })
    ]
  },
  {
    target: "node",
    node: {
      __dirname: false,
      __filename: false
    },
    mode: __DEV__ ? "development" : "production",
    entry: {
      "server/index": "./src/server/index.ts",
      "server/server": "./src/server/server.ts"
    },
    output: {
      libraryTarget: "commonjs2",
      filename: "[name].js",
      chunkFilename: "[name]-[id].js",
      path: __dirname + "/dist"
    },
    devtool: "source-map",
    externals: /^[a-z\-0-9]+$/,
    resolve: {
      extensions: [".ts", ".tsx", ".js", ".json"]
    },
    module: {
      rules: [
        // All files with a '.ts' or '.tsx' extension will be handled by
        // 'awesome-typescript-loader'.
        { test: /\.tsx?$/, loader: "awesome-typescript-loader" },

        // All output '.js' files will have any sourcemaps re-processed by
        // 'source-map-loader'.
        { enforce: "pre", test: /\.js$/, loader: "source-map-loader" }
      ]
    }
  },
  {
    target: "node",
    mode: "development",
    entry: glob.sync("./src/**/*.test.{ts,tsx}").reduce((acc, file) => {
      acc[file.replace(/^\.\/src\//, "").replace(/\.tsx?$/, "")] = file;
      return acc;
    }, {}),
    output: {
      libraryTarget: "commonjs2",
      filename: "[name].js",
      chunkFilename: "[name]-[id].js",
      path: __dirname + "/dist"
    },
    devtool: "source-map",
    externals: /^[@a-z\-0-9]/,
    resolve: {
      extensions: [".ts", ".tsx", ".js", ".json"]
    },
    module: {
      rules: [
        // All files with a '.ts' or '.tsx' extension will be handled by
        // 'awesome-typescript-loader'.
        { test: /\.tsx?$/, loader: "awesome-typescript-loader" },

        // All output '.js' files will have any sourcemaps re-processed by
        // 'source-map-loader'.
        { enforce: "pre", test: /\.js$/, loader: "source-map-loader" }
      ]
    }
  }
];
