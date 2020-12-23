# Contributing

## The Development Environment

Using Docker for development is recommend, as it avoids "special cases" around customized environments. The default `docker-compose.yaml` file in this repo's root will handle:

1. installing all necessary dependencies
2. building the various packages
3. running postgres
4. running the demo server

**NOTE:** The development environment brings up a TypeScript process for each package to watch files for changes. This requires a significant amount of memory. If running Docker for Mac, please ensure you have allocated sufficient memory to your Docker virtual machine.

To get started, run:

```bash
# Note that if no environment variables are present, docker will publish the
# services on dynamically-chosen, available ports.
PUBLISH_PORT_HTTP=8888 PUBLISH_PORT_POSTGRES=5555 docker-compose up -d

# Check to make sure everything came up.
docker-compose ps

# Tail the logs of all running containers.
docker-compose logs -f
```

By default, running `up` does _not_ create the database schema or fill it with fixtured data. To do this, run:

```bash
# Create the authx database schema.
docker-compose run --rm server yarn authx schema

# Populate the database with fixed sample data.
docker-compose run --rm server yarn authx fixture
```

Docker will have read and write access to the project directory, but will mount its own copy of the `node_modules` directory. This allows different natively combiled dependencies to be used inside the containers and on the host for scripts/IDEs.

## Testing

The `server` service in docker-compose is an ideal place for running tests, either the self-contained tests in each package, or the broader integration tests in this repo's root.

```bash
# Run the entire test suite.
docker-compose run --rm server yarn test

# Run a bash container and execute tests in a specific package.
docker-compose run --rm server bash
cd packages/scopes
yarn test
```
