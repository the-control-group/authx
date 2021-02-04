import { ClientBase, Pool } from "pg";

interface Entities {
  readonly authorityIds?: readonly string[];
  readonly authorizationIds?: readonly string[];
  readonly clientIds?: readonly string[];
  readonly credentialIds?: readonly string[];
  readonly grantIds?: readonly string[];
  readonly roleIds?: readonly string[];
  readonly userIds?: readonly string[];
}

export async function lockEntities(
  tx: Pool | ClientBase,
  entities: Entities
): Promise<void> {
  for (const key of Object.keys(entities).sort()) {
    const entityName = key.replace("Ids", "");

    await lockEntityType(
      tx,
      entityName,
      ((entities as unknown) as { [key: string]: readonly string[] })[key]
    );
  }

  // Ideally, this function should be called either 0 or 1 times per transaction. This is why it's able to lock
  // a bunch of entities at once. If it's called multiple times for whatever reason, there's serious danger of
  // deadlock and the resulting code paths should probably be fixed.
  const txnId = (await tx.query(`SELECT txid_current()`, [])).rows[0]
    .txid_current;

  if ((tx as any)._locksAppliedTxnId == txnId) {
    console.log(`Possible double-locking! ${txnId} ${entities}`);
  } else {
    (tx as any)._locksAppliedTxnId = txnId;
  }
}

async function lockEntityType(
  tx: Pool | ClientBase,
  entityName: string,
  ids: readonly string[]
): Promise<void> {
  // Our Postgres client doesn't allow escaping of table names, so be extra careful
  // just in case some code allows through untrusted data.
  if (
    ![
      "authority",
      "authorization",
      "client",
      "credential",
      "grant",
      "role",
      "user",
    ].includes(entityName)
  ) {
    throw Error(`${entityName} is not a recognized entity type`);
  }

  await tx.query(
    `SELECT id FROM authx.${entityName} WHERE id = ANY($1) FOR UPDATE`,
    [ids]
  );
}
