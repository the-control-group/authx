import { ClientBase, Client } from "pg";

import {
  authority,
  client,
  credential,
  grant,
  role,
  authorization,
  user,
} from "./fixture/index";

export async function fixture(tx: ClientBase | Client): Promise<void> {
  // add entities to satisfy foreign key constraints
  await Promise.all([
    tx.query(
      "INSERT INTO authx.grant (id) SELECT id FROM UNNEST($1::uuid[]) AS id",
      [grant.map(({ id }) => id)]
    ),
    tx.query(
      "INSERT INTO authx.authority (id) SELECT id FROM UNNEST($1::uuid[]) AS id",
      [authority.map(({ id }) => id)]
    ),
    tx.query(
      "INSERT INTO authx.client (id) SELECT id FROM UNNEST($1::uuid[]) AS id",
      [client.map(({ id }) => id)]
    ),
    tx.query(
      "INSERT INTO authx.credential (id) SELECT id FROM UNNEST($1::uuid[]) AS id",
      [credential.map(({ id }) => id)]
    ),
    tx.query(
      "INSERT INTO authx.role (id) SELECT id FROM UNNEST($1::uuid[]) AS id",
      [role.map(({ id }) => id)]
    ),
    tx.query(
      "INSERT INTO authx.authorization (id) SELECT id FROM UNNEST($1::uuid[]) AS id",
      [authorization.map(({ id }) => id)]
    ),
    tx.query(
      "INSERT INTO authx.user (id) SELECT id FROM UNNEST($1::uuid[]) AS id",
      [user.map(({ id }) => id)]
    ),
  ]);

  // insert grants first
  await Promise.all(grant.map(({ insert }) => insert(tx)));

  // insert the records
  await Promise.all([
    Promise.all(authority.map(({ insert }) => insert(tx))),
    Promise.all(client.map(({ insert }) => insert(tx))),
    Promise.all(credential.map(({ insert }) => insert(tx))),
    Promise.all(role.map(({ insert }) => insert(tx))),
    Promise.all(authorization.map(({ insert }) => insert(tx))),
    Promise.all(user.map(({ insert }) => insert(tx))),
  ]);
}
