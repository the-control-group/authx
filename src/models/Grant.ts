import { PoolClient } from "pg";
import { Client } from "./Client";
import { User } from "./User";

const CLIENT = Symbol("client");
const USER = Symbol("user");

export class Grant<T = {}> {
  public readonly id: string;
  public readonly enabled: boolean;
  public readonly clientId: string;
  public readonly userId: string;
  public readonly nonce: null | string;
  public readonly refreshToken: string;
  public readonly scopes: string[];

  private [CLIENT]: null | Promise<Client> = null;
  private [USER]: null | Promise<User> = null;

  public constructor(data: {
    id: string;
    enabled: boolean;
    clientId: string;
    userId: string;
    nonce: null | string;
    refreshToken: string;
    scopes: string[];
  }) {
    this.id = data.id;
    this.enabled = data.enabled;
    this.clientId = data.clientId;
    this.userId = data.userId;
    this.nonce = data.nonce;
    this.refreshToken = data.refreshToken;
    this.scopes = data.scopes;
  }

  public async client(
    tx: PoolClient,
    refresh: boolean = false
  ): Promise<Client> {
    const client = this[CLIENT];
    if (client && !refresh) {
      return client;
    }

    return (this[CLIENT] = Client.read(tx, this.clientId));
  }

  public async user(tx: PoolClient, refresh: boolean = false): Promise<User> {
    const user = this[USER];
    if (user && !refresh) {
      return user;
    }

    return (this[USER] = User.read(tx, this.userId));
  }

  public static read(tx: PoolClient, id: string): Promise<Grant>;
  public static read(tx: PoolClient, id: string[]): Promise<Grant[]>;
  public static async read(
    tx: PoolClient,
    id: string[] | string
  ): Promise<Grant[] | Grant> {
    if (typeof id !== "string" && !id.length) {
      return [];
    }

    const result = await tx.query(
      `
      SELECT
        entity_id AS id,
        enabled,
        client_id,
        user_id,
        nonce,
        refresh_token,
        scopes
      FROM authx.grant_record
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

    const grants = result.rows.map(
      row =>
        new Grant({
          ...row,
          clientId: row.client_id,
          userId: row.user_id,
          refreshToken: row.refresh_token
        })
    );

    return typeof id === "string" ? grants[0] : grants;
  }

  public static async write(
    tx: PoolClient,
    data: Grant,
    metadata: {
      recordId: string;
      createdBySessionId: string;
      createdAt: Date;
    }
  ): Promise<Grant> {
    // ensure that the entity ID exists
    await tx.query(
      `
      INSERT INTO authx.grant
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
      UPDATE authx.grant_record
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
      INSERT INTO authx.grant_record
      (
        record_id,
        created_by_session_id,
        created_at,
        entity_id,
        enabled,
        client_id,
        user_id,
        nonce,
        refresh_token,
        scopes
      )
      VALUES
        ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING
        entity_id AS id,
        enabled,
        client_id,
        user_id,
        nonce,
        refresh_token,
        scopes
      `,
      [
        metadata.recordId,
        metadata.createdBySessionId,
        metadata.createdAt,
        data.id,
        data.enabled,
        data.clientId,
        data.userId,
        data.nonce,
        data.refreshToken,
        [...data.scopes]
      ]
    );

    if (next.rows.length !== 1) {
      throw new Error("INVARIANT: Insert must return exactly one row.");
    }

    const row = next.rows[0];
    return new Grant({
      ...row,
      clientId: row.client_id,
      userId: row.user_id,
      refreshToken: row.refresh_token
    });
  }
}
