import pg from "pg";
import { fixture } from "../lib/fixture.js";
import { readFile } from "fs/promises";

export default async (
  pathToPrivateKey: string,
  pathToPublicKey: string,
): Promise<void> => {
  const pool = new pg.Pool();
  const tx = await pool.connect();

  try {
    await tx.query("BEGIN DEFERRABLE");

    // Load the private key file.
    const [privateKey, publicKey] = await Promise.all([
      readFile(pathToPrivateKey, "utf8"),
      readFile(pathToPublicKey, "utf8"),
    ]);

    await fixture(tx, privateKey, publicKey);

    await tx.query("COMMIT");
  } catch (error) {
    console.error(error);
    tx.query("ROLLBACK");
  } finally {
    tx.release();
    await pool.end();
  }
};
