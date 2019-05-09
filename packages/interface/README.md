# AuthX Interface

The AuthX Interface is a reference user interface that provides the visual components necessary for a user to authenticate herself and authorize a client to access resources on her behalf.

It is responsible for the entire user-facing portion of the OAuth flow, from authenticating a user to authorizing a client.

The app is written in TypeScript with JSX extensions for react.

---

[Development](#development)

---

## Development

### Scripts

These scripts can be run using `npm run <script>` or `yarn <script>`.

#### `format`

Use prettier to format the code in this package.

#### `lint`

Check the contents of this package against prettier and eslint rules.

#### `prepare`

Build the files from `/src` to the `/dist` directory with optimizations.

#### `prepare:development`

Build the files from `/src` to the `/dist` directory, and re-build as changes are made to source files.

#### `start`

Start a web server that serves the contents of `/dist`. Use the `PORT` environment variable to specify a port.

#### `start:development`

Start a web server that serves the contents of `/dist` and reload as files change. Use the `PORT` environment variable to specify a port.

#### `test`

Run all tests from the `/dist` directory.

#### `test:development`

Run all tests from the `/dist` directory, and re-run a test when it changes.

### Files

#### [/src/client](src/client/)

This holds the source code for the client-side interface.

#### [/src/server](src/server/)

This holds the source code for a Koa middleware that serves the contents from `/dist/client`

#### [/dist](dist/)

The compiled and bundled code ends up here for distribution. This is ignored by git.
