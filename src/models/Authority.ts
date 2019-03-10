import { PoolClient } from "pg";
import { Credential } from "./Credential";

const CREDENTIALS = Symbol("credentials");

export class Authority<T = {}> {
  public readonly id: string;
  public readonly enabled: boolean;
  public readonly name: string;
  public readonly strategy: string;
  public readonly details: T;

  private [CREDENTIALS]: null | Promise<Credential[]> = null;

  public constructor(data: {
    id: string;
    enabled: boolean;
    name: string;
    strategy: string;
    details: T;
  }) {
    this.id = data.id;
    this.enabled = data.enabled;
    this.name = data.name;
    this.strategy = data.strategy;
    this.details = data.details;
  }

  public async credentials(
    tx: PoolClient,
    refresh: boolean = false
  ): Promise<Credential[]> {
    const credentials = this[CREDENTIALS];
    if (credentials && !refresh) {
      return credentials;
    }

    return (this[CREDENTIALS] = (async () =>
      Credential.read(
        tx,
        (await tx.query(
          `
          SELECT entity_id AS id
          FROM authx.credential_records
          WHERE
            authority_id = $1
            AND replacement_record_id IS NULL
          `,
          [this.id]
        )).rows.map(({ id }) => id)
      ))());
  }

  public $write(
    tx: PoolClient,
    metadata: {
      recordId: string;
      createdBySessionId: string;
      createdAt: Date;
    }
  ): Promise<Authority> {
    return Authority.write(tx, this, metadata);
  }

  public static read(tx: PoolClient, id: string): Promise<Authority>;
  public static read(tx: PoolClient, id: string[]): Promise<Authority[]>;
  public static async read(
    tx: PoolClient,
    id: string[] | string
  ): Promise<Authority[] | Authority> {
    const result = await tx.query(
      `
      SELECT
        entity_id AS id,
        enabled,
        name,
        strategy,
        details
      FROM authx.authority_record
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

    const authorities = result.rows.map(
      row =>
        new Authority({
          ...row,
          baseUrls: row.base_urls
        })
    );

    return typeof id === "string" ? authorities[0] : authorities;
  }

  public static async write(
    tx: PoolClient,
    data: Authority,
    metadata: {
      recordId: string;
      createdBySessionId: string;
      createdAt: Date;
    }
  ): Promise<Authority> {
    // ensure that the entity ID exists
    await tx.query(
      `
      INSERT INTO authx.authority
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
      UPDATE authx.authority_record
      SET replacement_record_id = $2
      WHERE
        entity_id = $1
        AND replacement_record_id IS NULL
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
      INSERT INTO authx.authority_record
      (
        record_id,
        created_by_session_id,
        created_at,
        entity_id,
        enabled,
        name,
        strategy,
        details
      )
      VALUES
        ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING
        entity_id AS id,
        enabled,
        name,
        strategy,
        details
      `,
      [
        metadata.recordId,
        metadata.createdBySessionId,
        metadata.createdAt,
        data.id,
        data.enabled,
        data.name,
        data.strategy,
        data.details
      ]
    );

    if (next.rows.length !== 1) {
      throw new Error("INVARIANT: Insert must return exactly one row.");
    }

    const row = next.rows[0];
    return new Authority({
      ...row,
      baseUrls: row.base_urls
    });
  }
}
