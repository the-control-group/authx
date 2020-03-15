echo 'CREATE DATABASE authx;' | docker-compose exec -T -e 'PGUSER=postgres' -e 'PGPASSWORD=postgres' postgres psql
docker-compose exec -T -e 'PGHOST=postgres' -e 'PGUSER=postgres' -e 'PGPASSWORD=postgres' server-builder yarn authx schema
docker-compose exec -T -e 'PGHOST=postgres' -e 'PGUSER=postgres' -e 'PGPASSWORD=postgres' server-builder yarn authx fixture

echo 'Creating new superuser:'
docker-compose exec -T -e 'PGHOST=postgres' -e 'PGUSER=postgres' -e 'PGPASSWORD=postgres' server-builder yarn authx bootstrap