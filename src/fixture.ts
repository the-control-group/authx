import { PoolClient } from "pg";
import path from "path";
import fs from "fs";

import { authority, client, credential, grant, role, user } from "./fixtures";

const sql = fs.readFileSync(path.resolve(__dirname, "../schema.sql"));

interface Metadata {
  recordId: string;
  createdByGrantId: string;
  createdAt: Date;
}

export default async (tx: PoolClient) => {
  // set up the schema
  await tx.query(sql.toString("utf8"));

  // add entities to satisfy foreign key constraints
  await Promise.all([
    tx.query(
      "INSERT INTO authx.authority (id) VALUES SELECT FROM UNNEST($1::uuid[])",
      [authority.map(({ data: { id } }) => id)]
    ),
    tx.query(
      "INSERT INTO authx.client (id) VALUES SELECT FROM UNNEST($1::uuid[])",
      [client.map(({ data: { id } }) => id)]
    ),
    tx.query(
      "INSERT INTO authx.credential (id) VALUES SELECT FROM UNNEST($1::uuid[])",
      [credential.map(({ data: { id } }) => id)]
    ),
    tx.query(
      "INSERT INTO authx.grant (id) VALUES SELECT FROM UNNEST($1::uuid[])",
      [grant.map(({ data: { id } }) => id)]
    ),
    tx.query(
      "INSERT INTO authx.role (id) VALUES SELECT FROM UNNEST($1::uuid[])",
      [role.map(({ data: { id } }) => id)]
    ),
    tx.query(
      "INSERT INTO authx.user (id) VALUES SELECT FROM UNNEST($1::uuid[])",
      [user.map(({ data: { id } }) => id)]
    )
  ]);

  // insert the records
  await Promise.all([
    User.write(tx, user.data, user.metadata),
    Client.write(tx, client.data, client.metadata),
    Grant.write(tx, grant.data, grant.metadata),
    Role.write(tx, role.data, role.metadata)
  ]);
};
