// eslint-disable-next-line @typescript-eslint/no-var-requires
const path = require("path");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const HtmlWebpackPlugin = require("html-webpack-plugin");

const __DEV__ = process.env.NODE_ENV !== "production";

module.exports = [
  {
    target: "web",
    mode: __DEV__ ? "development" : "production",
    entry: ["./src/authenticate/authenticate.tsx"],
    output: {
      filename: "$authenticate-[contenthash].js",
      chunkFilename: "$authenticate-[id]-[contenthash].js",
      path: __dirname + "/dist/authenticate"
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
        template: path.join(__dirname, "src/index.html"),
        filename: "index.html"
      })
    ]
  },
  {
    target: "web",
    mode: __DEV__ ? "development" : "production",
    entry: ["./src/authorize/authorize.tsx"],
    output: {
      filename: "$authorize-[contenthash].js",
      chunkFilename: "$authorize-[id]-[contenthash].js",
      path: __dirname + "/dist/authorize"
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
        template: path.join(__dirname, "src/index.html"),
        filename: "index.html"
      })
    ]
  }
];
