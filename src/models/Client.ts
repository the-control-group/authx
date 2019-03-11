import { PoolClient } from "pg";
import { Grant } from "./Grant";

export interface ClientData {
  readonly id: string;
  readonly enabled: boolean;
  readonly name: string;
  readonly scopes: Iterable<string>;
  readonly oauthSecret: string;
  readonly oauthUrls: Iterable<string>;
}

export class Client implements ClientData {
  public readonly id: string;
  public readonly enabled: boolean;
  public readonly name: string;
  public readonly scopes: Set<string>;
  public readonly oauthSecret: string;
  public readonly oauthUrls: Set<string>;

  public constructor(data: ClientData) {
    this.id = data.id;
    this.enabled = data.enabled;
    this.name = data.name;
    this.scopes = new Set(data.scopes);
    this.oauthSecret = data.oauthSecret;
    this.oauthUrls = new Set(data.oauthUrls);
  }

  public async grants(tx: PoolClient): Promise<Grant[]> {
    return Grant.read(
      tx,
      (await tx.query(
        `
        SELECT entity_id AS id
        FROM authx.grant_records
        WHERE
          client_id = $1
          AND replacement_record_id IS NULL
        `,
        [this.id]
      )).rows.map(({ id }) => id)
    );
  }

  public static read(tx: PoolClient, id: string): Promise<Client>;
  public static read(tx: PoolClient, id: string[]): Promise<Client[]>;
  public static async read(
    tx: PoolClient,
    id: string[] | string
  ): Promise<Client[] | Client> {
    if (typeof id !== "string" && !id.length) {
      return [];
    }

    const result = await tx.query(
      `
      SELECT
        entity_id AS id,
        enabled,
        name,
        scopes,
        oauth_secret,
        oauth_urls
      FROM authx.client_record
      WHERE
        entity_id = ANY($1)
        AND replacement_record_id IS NULL
      `,
      [typeof id === "string" ? [id] : id]
    );

    if (result.rows.length !== (typeof id === "string" ? 1 : id.length)) {
      throw new Error(
        "INVARIANT: Read must return the same number of records as requested."
      );
    }

    const clients = result.rows.map(
      row =>
        new Client({
          ...row,
          oauthUrls: row.oauth_urls
        })
    );

    return typeof id === "string" ? clients[0] : clients;
  }

  public static async write(
    tx: PoolClient,
    data: ClientData,
    metadata: { recordId: string; createdBySessionId: string; createdAt: Date }
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
      SET replacement_record_id = $2
      WHERE entity_id = $1 AND replacement_record_id IS NULL
      RETURNING entity_id AS id, record_id
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
        record_id,
        created_by_session_id,
        created_at,
        entity_id,
        enabled,
        name,
        scopes,
        oauth_secret,
        oauth_urls
      )
      VALUES
        ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING
        entity_id AS id,
        enabled,
        name,
        scopes,
        oauth_secret,
        oauth_urls
      `,
      [
        metadata.recordId,
        metadata.createdBySessionId,
        metadata.createdAt,
        data.id,
        data.enabled,
        data.name,
        [...data.scopes],
        data.oauthSecret,
        [...data.oauthUrls]
      ]
    );

    if (next.rows.length !== 1) {
      throw new Error("INVARIANT: Insert must return exactly one row.");
    }

    const row = next.rows[0];
    return new Client({
      ...row,
      oauthUrls: row.oauth_urls
    });
  }
}
