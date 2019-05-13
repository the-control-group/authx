import { Pool } from "pg";
import { schema } from "../lib/schema";

export default async () => {
  const pool = new Pool();
  const tx = await pool.connect();

  try {
    await tx.query("BEGIN DEFERRABLE");

    await schema(tx);

    await tx.query("COMMIT");
  } catch (error) {
    console.error(error);
    tx.query("ROLLBACK");
  } finally {
    tx.release();
    await pool.end();
  }
};
