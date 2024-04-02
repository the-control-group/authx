# Generate keys for the AuthX server.
node scripts/generate-keys.js

# Start the pipeline and AuthX server.
PUBLISH_PORT_HTTP=8888 PUBLISH_PORT_POSTGRES=5555 docker compose --profile=development up --detach

# Create the authx database schema.
docker compose run --rm --tty server npx authx schema

# Bootstrap the database with an initial user and credential.
docker compose run --rm --tty server npx authx bootstrap

# Done! You can now access the AuthX server at http://localhost:8888.
echo 'Bootstrap complete! You can now access the AuthX server at http://localhost:8888 and tail the logs by running `docker compose logs -f`.'