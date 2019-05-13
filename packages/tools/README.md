# AuthX Strategy – Password

This package provides basic tools for interacting with an AuthX deployment.

## CLI

This package provides and `authx` command-line interface which can be accessed as `yarn authx <action>` or `npx authx <action>`.

### Actions

#### `schema`

Create the database schema.

#### `bootstrap`

Bootstrap a database by creating an initial root user and admin role, returning the user ID and password as JSON. Use the above environment variables to configure the postgres connection.

Pass the `--schema` argument to also create the database schema.

#### `fixture`

Add test fixtures to the database. Use the above environment variables to configure the postgres connection.

Pass the `--schema` argument to also create the database schema.

### Environment Variables

When relevant, the following environment variables can be set to modify the CLI's behavior:

- `PGHOST`: postgres host
- `PGPORT`: postgres port
- `PGUSER`: postgres user
- `PGPASSWORD`: postgres password

## Programmatic Access

This package also exports its actions for use in other node projects. See the source code for more details.
