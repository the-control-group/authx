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
} from "./fixtures";

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
      [grant.map(({ data: { id } }) => id)]
    ),
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
      "INSERT INTO authx.role (id) SELECT id FROM UNNEST($1::uuid[]) AS id",
      [role.map(({ data: { id } }) => id)]
    ),
    tx.query(
      "INSERT INTO authx.token (id) SELECT id FROM UNNEST($1::uuid[]) AS id",
      [token.map(({ data: { id } }) => id)]
    ),
    tx.query(
      "INSERT INTO authx.user (id) SELECT id FROM UNNEST($1::uuid[]) AS id",
      [user.map(({ data: { id } }) => id)]
    )
  ]);

  // insert grants first
  await Promise.all(
    grant.map(({ class: Grant, data, metadata }) =>
      Grant.write(tx, data, metadata)
    )
  );

  // insert the records
  await Promise.all([
    Promise.all(
      authority.map(({ class: Authority, data, metadata }) =>
        Authority.write(tx, data, metadata)
      )
    ),
    Promise.all(
      client.map(({ class: Client, data, metadata }) =>
        Client.write(tx, data, metadata)
      )
    ),
    Promise.all(
      credential.map(({ class: Credential, data, metadata }) =>
        Credential.write(tx, data, metadata)
      )
    ),
    Promise.all(
      role.map(({ class: Role, data, metadata }) =>
        Role.write(tx, data, metadata)
      )
    ),
    Promise.all(
      token.map(({ class: Token, data, metadata }) =>
        Token.write(tx, data, metadata)
      )
    ),
    Promise.all(
      user.map(({ class: User, data, metadata }) =>
        User.write(tx, data, metadata)
      )
    )
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
  }
})();
