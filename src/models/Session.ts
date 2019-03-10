import { PoolClient } from "pg";
import { Client } from "./Client";
import { Grant } from "./Grant";

const GRANT = Symbol("GRANT");

export class Session {
  public readonly id: string;
  public readonly enabled: boolean;
  public readonly grantId: string;
  public readonly scopes: string[];

  private [GRANT]: null | Promise<Grant> = null;

  public constructor(data: {
    id: string;
    enabled: boolean;
    grantId: string;
    scopes: string[];
  }) {
    this.id = data.id;
    this.enabled = data.enabled;
    this.grantId = data.grantId;
    this.scopes = data.scopes;
  }

  public async grant(tx: PoolClient, refresh: boolean = false): Promise<Grant> {
    const grant = this[GRANT];
    if (grant && !refresh) {
      return grant;
    }

    return (this[GRANT] = Grant.read(tx, this.grantId));
  }

  public static read(tx: PoolClient, id: string): Promise<Session>;
  public static read(tx: PoolClient, id: string[]): Promise<Session[]>;
  public static async read(
    tx: PoolClient,
    id: string[] | string
  ): Promise<Session[] | Session> {
    const result = await tx.query(
      `
      SELECT
        entity_id AS id,
        enabled,
        grant_id,
        scopes
      FROM authx.session_record
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

    const sessions = result.rows.map(
      row =>
        new Session({
          ...row,
          clientId: row.client_id,
          userId: row.user_id,
          refreshToken: row.refresh_token
        })
    );

    return typeof id === "string" ? sessions[0] : sessions;
  }

  public static async write(
    tx: PoolClient,
    data: Session,
    metadata: {
      recordId: string;
      createdBySessionId: string;
      createdAt: Date;
    }
  ): Promise<Session> {
    // ensure that the entity ID exists
    await tx.query(
      `
      INSERT INTO authx.session
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
      UPDATE authx.session_record
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
      INSERT INTO authx.session_record
      (
        record_id,
        created_by_session_id,
        created_at,
        entity_id,
        enabled,
        grant_id,
        scopes
      )
      VALUES
        ($1, $2, $3, $4, $5, $6, $7)
      RETURNING
        entity_id AS id,
        enabled,
        grant_id,
        scopes
      `,
      [
        metadata.recordId,
        metadata.createdBySessionId,
        metadata.createdAt,
        data.id,
        data.enabled,
        data.grantId,
        data.scopes
      ]
    );

    if (next.rows.length !== 1) {
      throw new Error("INVARIANT: Insert must return exactly one row.");
    }

    const row = next.rows[0];
    return new Session({
      ...row,
      clientId: row.client_id,
      userId: row.user_id,
      refreshToken: row.refresh_token
    });
  }
}
