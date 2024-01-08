# Note that if no environment variables are present, docker will publish the
# services on dynamically-chosen, available ports.
PUBLISH_PORT_HTTP=8888 PUBLISH_PORT_POSTGRES=5555 docker compose up -d

# Create the authx database schema.
docker compose run --rm server npx authx schema

# Populate the database with fixed sample data.
docker compose run --rm server npx authx fixture

# Done! You can now access the AuthX server at http://localhost:8888.
echo "Bootstrap complete! You can now access the AuthX server at http://localhost:8888."