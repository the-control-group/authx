import { PoolClient } from "pg";
import path from "path";
import fs from "fs";

import { User, Client, Grant, Role } from "../models";

const sql = fs.readFileSync(path.resolve(__dirname, "../../schema.sql"));

interface Metadata {
  recordId: string;
  createdByGrantId: string;
  createdAt: Date;
}

export default async (
  tx: PoolClient,
  {
    user,
    client,
    grant,
    role
  }: {
    user: { data: User; metadata: Metadata };
    client: { data: Client; metadata: Metadata };
    grant: { data: Grant; metadata: Metadata };
    role: { data: Role; metadata: Metadata };
  }
) => {
  // set up the schema
  await tx.query(sql.toString("utf8"));

  // add entities to satisfy foreign key constraints
  await Promise.all([
    tx.query("INSERT INTO authx.user (id) VALUES ($1)", [user.data.id]),
    tx.query("INSERT INTO authx.client (id) VALUES ($1)", [client.data.id]),
    tx.query("INSERT INTO authx.grant (id) VALUES ($1)", [grant.data.id]),
    tx.query("INSERT INTO authx.role (id) VALUES ($1)", [role.data.id])
  ]);

  // insert the records
  await Promise.all([
    User.write(tx, user.data, user.metadata),
    Client.write(tx, client.data, client.metadata),
    Grant.write(tx, grant.data, grant.metadata),
    Role.write(tx, role.data, role.metadata)
  ]);
};
