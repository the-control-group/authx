import { ClientBase, Pool } from "pg";

export async function lockEntityType(
  tx: Pool | ClientBase,
  entityName:
    | "authority"
    | "authorization"
    | "client"
    | "credential"
    | "grant"
    | "role"
    | "user",
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
