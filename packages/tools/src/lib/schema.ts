import { ClientBase, Client } from "pg";
import fs from "fs";
import { fileURLToPath} from "url";

const sql = fs
  .readFileSync(fileURLToPath(import.meta.resolve("@authx/authx/schema.sql")))
  .toString("utf8");

export async function schema(tx: ClientBase | Client): Promise<void> {
  await tx.query(sql);
}
