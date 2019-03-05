import { PoolClient } from "pg";
import { Client } from "./Client";
import { User } from "./User";

const CLIENT = Symbol("client");
const USER = Symbol("user");

export class Grant<T = {}> {
  public id: string;
  public clientId: string;
  public userId: string;
  public nonce: null | string;
  public refreshToken: string;
  public scopes: string[];

  private [CLIENT]: null | Promise<Client> = null;
  private [USER]: null | Promise<User> = null;

  public constructor(data: {
    id: string;
    clientId: string;
    userId: string;
    nonce: null | string;
    refreshToken: string;
    scopes: string[];
  }) {
    this.id = data.id;
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

    return (this[CLIENT] = (async () => {
      const authorities = await Client.read(tx, [this.clientId]);
      if (authorities.length !== 1) {
        throw new Error("INVARIANT: Exactly one user must be returned.");
      }

      return authorities[0];
    })());
  }

  public async user(tx: PoolClient, refresh: boolean = false): Promise<User> {
    const user = this[USER];
    if (user && !refresh) {
      return user;
    }

    return (this[USER] = (async () => {
      const users = await User.read(tx, [this.userId]);
      if (users.length !== 1) {
        throw new Error("INVARIANT: Exactly one user must be returned.");
      }

      return users[0];
    })());
  }

  public static async read(
    tx: PoolClient,
    id: string | string[]
  ): Promise<Grant[]> {
    const result = await tx.query(
      `
      SELECT
        entity_id AS id,
        client_id,
        user_id,
        nonce,
        refresh_token,
        scopes
      FROM authx.grant_record
      WHERE
        entity_id = ANY($1)
        AND replacement_id IS NULL
      `,
      [id]
    );

    return result.rows.map(
      row =>
        new Grant({
          ...row,
          clientId: row.client_id,
          userId: row.user_id,
          refreshToken: row.refresh_token
        })
    );
  }

  public static async write(
    tx: PoolClient,
    data: Grant,
    metadata: {
      recordId: string;
      createdByGrantId: string;
      createdAt: string;
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
      SET replacement_id = $2
      WHERE
        entity_id = $1
        AND replacement_id IS NULL
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
      INSERT INTO authx.grant_record
      (
        id,
        created_by_grant_id,
        created_at,
        entity_id,
        client_id,
        user_id,
        nonce,
        refresh_token,
        scopes
      )
      VALUES
        ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING
        entity_id AS id,
        client_id,
        user_id,
        nonce,
        refresh_token,
        scopes
      `,
      [
        metadata.recordId,
        metadata.createdByGrantId,
        metadata.createdAt,
        data.id,
        data.clientId,
        data.userId,
        data.nonce,
        data.refreshToken,
        data.scopes
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
