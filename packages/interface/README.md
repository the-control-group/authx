# AuthX Interface

The AuthX Interface is a reference user interface that provides the visual components necessary for a user to authenticate herself and authorize a client to access resources on her behalf.

It is responsible for the entire user-facing portion of the OAuth flow, from authenticating a user to authorizing a client.

The app is written in TypeScript with JSX extensions for react.

## Development

### Scripts

#### `yarn format`

Use prettier to format the code in this package.

#### `yarn lint`

Check the contents of this package against prettier and eslint rules.

#### `yarn prepare`

Build the files from `/src` to the `/dist` directory with optimizations.

#### `yarn prepare:development`

Build the files from `/src` to the `/dist` directory, and re-build as changes are made to source files.

#### `yarn start`

Start a web server that serves the contents of `/dist`. Use the `PORT` environment variable to specify a port.

#### `yarn start:development`

Start a web server that serves the contents of `/dist` and reload as files change. Use the `PORT` environment variable to specify a port.

#### `yarn test`

Run all tests from the `/dist` directory.

#### `yarn test:development`

Run all tests from the `/dist` directory, and re-run a test when it changes.

### Files

#### `/src/client`

This holds the source code for the client-side interface.

#### `/src/server`

This holds the source code for a Koa middleware that serves the contents from `/dist/client`

#### `/dist`

The compiled and bundled code ends up here for distribution. This is ignored by git.
