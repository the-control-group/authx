import { PoolClient } from "pg";
import { Grant } from "./Grant";

const GRANTS = Symbol("grants");

export class Client {
  public readonly id: string;
  public readonly enabled: boolean;
  public readonly name: string;
  public readonly secret: string;
  public readonly scopes: Set<string>;
  public readonly baseUrls: Set<string>;

  private [GRANTS]: null | Promise<Grant[]> = null;

  public constructor(data: {
    id: string;
    enabled: boolean;
    name: string;
    secret: string;
    scopes: Iterable<string>;
    baseUrls: Iterable<string>;
  }) {
    this.id = data.id;
    this.enabled = data.enabled;
    this.name = data.name;
    this.secret = data.secret;
    this.scopes = new Set(data.scopes);
    this.baseUrls = new Set(data.baseUrls);
  }

  public async grants(
    tx: PoolClient,
    refresh: boolean = false
  ): Promise<Grant[]> {
    const grants = this[GRANTS];
    if (grants && !refresh) {
      return grants;
    }

    // query the database for grants
    return (this[GRANTS] = (async () =>
      Grant.read(
        tx,
        (await tx.query(
          `
          SELECT entity_id AS id
          FROM authx.grant_records
          WHERE
            client_id = $1
            AND replacement_id IS NULL
          `,
          [this.id]
        )).rows.map(({ id }) => id)
      ))());
  }

  public static async read(
    tx: PoolClient,
    id: string | string[]
  ): Promise<Client[]> {
    const result = await tx.query(
      `
      SELECT
        entity_id AS id,
        enabled,
        name,
        secret,
        scopes,
        base_urls
      FROM authx.client_record
      WHERE
        entity_id = ANY($1)
        AND replacement_id IS NULL
      `,
      [id]
    );

    return result.rows.map(
      row =>
        new Client({
          ...row,
          baseUrls: row.base_urls
        })
    );
  }

  public static async write(
    tx: PoolClient,
    data: Client,
    metadata: { recordId: string; createdByGrantId: string; createdAt: Date }
  ): Promise<Client> {
    // ensure that the entity ID exists
    await tx.query(
      `
      INSERT INTO authx.client
        (id)
      VALUES
        ($1)
      ON CONFLICT DO NOTHING
      `,
      [data.id]
    );

    // replace the previous record
    const previous = await tx.query(
      `
      UPDATE authx.client_record
      SET replacement_id = $2
      WHERE entity_id = $1 AND replacement_id IS NULL
      RETURNING id
      `,
      [data.id, metadata.recordId]
    );

    if (previous.rows.length >= 1) {
      throw new Error(
        "INVARIANT: It must be impossible to replace more than one record."
      );
    }

    // insert the new record
    const next = await tx.query(
      `
      INSERT INTO authx.client_record
      (
        id,
        created_by_grant_id,
        created_at,
        entity_id,
        enabled,
        name,
        secret,
        scopes,
        base_urls
      )
      VALUES
        ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING
        entity_id AS id,
        enabled,
        name,
        secret,
        scopes,
        base_urls
      `,
      [
        metadata.recordId,
        metadata.createdByGrantId,
        metadata.createdAt,
        data.id,
        data.enabled,
        data.name,
        data.secret,
        data.scopes,
        data.baseUrls
      ]
    );

    if (next.rows.length !== 1) {
      throw new Error("INVARIANT: Insert must return exactly one row.");
    }

    const row = next.rows[0];
    return new Client({
      ...row,
      baseUrls: row.base_urls
    });
  }
}
