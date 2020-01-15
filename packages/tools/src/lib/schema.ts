import { ClientBase, Client } from "pg";
import fs from "fs";

const sql = fs
  .readFileSync(require.resolve("@authx/authx/schema.sql"))
  .toString("utf8");

export async function schema(tx: ClientBase | Client): Promise<void> {
  await tx.query(sql);
}
