import { Pool } from "pg";
import { fixture } from "../util/fixture";

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
