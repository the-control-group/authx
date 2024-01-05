echo 'Creating database...'
if ! (echo 'CREATE DATABASE authx;' | docker-compose exec -T -e 'PGUSER=postgres' -e 'PGPASSWORD=postgres' postgres psql);
	then exit 1
fi

echo 'Writing schema...'
if ! (docker-compose exec -T -e 'PGHOST=postgres' -e 'PGUSER=postgres' -e 'PGPASSWORD=postgres' server-builder npx authx schema);
	then exit 1
fi

echo 'Loading fixtures...'
if ! (docker-compose exec -T -e 'PGHOST=postgres' -e 'PGUSER=postgres' -e 'PGPASSWORD=postgres' server-builder npx authx fixture);
	then exit 1
fi

echo 'Creating new superuser...'
if ! (docker-compose exec -T -e 'PGHOST=postgres' -e 'PGUSER=postgres' -e 'PGPASSWORD=postgres' server-builder npx authx bootstrap);
	then exit 1
fi