import { PoolClient } from "pg";
import fs from "fs";

import { User, Client, Grant, Role } from "../models";

const sql = fs.readFileSync("../schema.sql", "utf8");

interface Metadata {
  recordId: string;
  createdByClientId: string;
  createdAt: string;
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
  await tx.query(sql);

  // add entities to satisfy foreign key constraints
  await Promise.all([
    tx.query("INSERT INTO authx.user (id) VALUES $0", [user.data.id]),
    tx.query("INSERT INTO authx.client (id) VALUES $0", [client.data.id]),
    tx.query("INSERT INTO authx.grant (id) VALUES $0", [grant.data.id]),
    tx.query("INSERT INTO authx.role (id) VALUES $0", [role.data.id])
  ]);

  // insert the records
  await Promise.all([
    User.write(tx, user.data, user.metadata),
    Client.write(tx, client.data, client.metadata),
    Grant.write(tx, grant.data, grant.metadata),
    Role.write(tx, role.data, role.metadata)
  ]);
};
