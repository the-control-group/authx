import { Pool, PoolClient } from "pg";
import path from "path";
import fs from "fs";

import { Authority, Client, Credential, Grant, Role, User } from "./models";
import { authority, client, credential, grant, role, user } from "./fixtures";

const sql = fs.readFileSync(path.resolve(__dirname, "../schema.sql"));

interface Metadata {
  recordId: string;
  createdByGrantId: string;
  createdAt: Date;
}

const fixture = async (tx: PoolClient): Promise<void> => {
  // set up the schema
  await tx.query(sql.toString("utf8"));

  // add entities to satisfy foreign key constraints
  await Promise.all([
    tx.query(
      "INSERT INTO authx.authority (id) SELECT id FROM UNNEST($1::uuid[]) AS id",
      [authority.map(({ data: { id } }) => id)]
    ),
    tx.query(
      "INSERT INTO authx.client (id) SELECT id FROM UNNEST($1::uuid[]) AS id",
      [client.map(({ data: { id } }) => id)]
    ),
    tx.query(
      "INSERT INTO authx.credential (id) SELECT id FROM UNNEST($1::uuid[]) AS id",
      [credential.map(({ data: { id } }) => id)]
    ),
    tx.query(
      "INSERT INTO authx.grant (id) SELECT id FROM UNNEST($1::uuid[]) AS id",
      [grant.map(({ data: { id } }) => id)]
    ),
    tx.query(
      "INSERT INTO authx.role (id) SELECT id FROM UNNEST($1::uuid[]) AS id",
      [role.map(({ data: { id } }) => id)]
    ),
    tx.query(
      "INSERT INTO authx.user (id) SELECT id FROM UNNEST($1::uuid[]) AS id",
      [user.map(({ data: { id } }) => id)]
    )
  ]);

  // insert the records
  await Promise.all([
    Promise.all(
      authority.map(({ data, metadata }) => Authority.write(tx, data, metadata))
    ),
    Promise.all(
      client.map(({ data, metadata }) => Client.write(tx, data, metadata))
    ),
    Promise.all(
      credential.map(({ data, metadata }) =>
        Credential.write(tx, data, metadata)
      )
    ),
    Promise.all(
      grant.map(({ data, metadata }) => Grant.write(tx, data, metadata))
    ),
    Promise.all(
      role.map(({ data, metadata }) => Role.write(tx, data, metadata))
    ),
    Promise.all(
      user.map(({ data, metadata }) => User.write(tx, data, metadata))
    )
  ]);
};

(async () => {
  const pool = new Pool();
  const tx = await pool.connect();

  try {
    await tx.query("BEGIN DEFERRABLE;");

    await fixture(tx);

    await tx.query("COMMIT");
  } catch (error) {
    console.error(error);
    tx.query("ABORT");
  } finally {
    tx.release();
  }
})();
