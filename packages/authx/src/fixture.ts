import { Pool, PoolClient } from "pg";
import path from "path";
import fs from "fs";

import {
  authority,
  client,
  credential,
  grant,
  role,
  token,
  user
} from "./fixture/index";

const sql = fs.readFileSync(path.resolve(__dirname, "../schema.sql"));

interface Metadata {
  recordId: string;
  createdByTokenId: string;
  createdAt: Date;
}

const fixture = async (tx: PoolClient): Promise<void> => {
  // set up the schema
  await tx.query(sql.toString("utf8"));

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
      "INSERT INTO authx.token (id) SELECT id FROM UNNEST($1::uuid[]) AS id",
      [token.map(({ id }) => id)]
    ),
    tx.query(
      "INSERT INTO authx.user (id) SELECT id FROM UNNEST($1::uuid[]) AS id",
      [user.map(({ id }) => id)]
    )
  ]);

  // insert grants first
  await Promise.all(grant.map(({ insert }) => insert(tx)));

  // insert the records
  await Promise.all([
    Promise.all(authority.map(({ insert }) => insert(tx))),
    Promise.all(client.map(({ insert }) => insert(tx))),
    Promise.all(credential.map(({ insert }) => insert(tx))),
    Promise.all(role.map(({ insert }) => insert(tx))),
    Promise.all(token.map(({ insert }) => insert(tx))),
    Promise.all(user.map(({ insert }) => insert(tx)))
  ]);
};

(async () => {
  const pool = new Pool();
  const tx = await pool.connect();

  try {
    await tx.query("BEGIN DEFERRABLE");

    await fixture(tx);

    await tx.query("COMMIT");
  } catch (error) {
    console.error(error);
    tx.query("ROLLBACK");
  } finally {
    tx.release();
    await pool.end();
  }
})();
