import { PoolClient } from "pg";
import fs from "fs";
import path from "path";

export async function schema(tx: PoolClient): Promise<void> {
  await tx.query(
    fs
      .readFileSync(path.resolve(__dirname, "../../schema.sql"))
      .toString("utf8")
  );
}
