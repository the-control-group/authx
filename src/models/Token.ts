import { PoolClient } from "pg";
import { User } from "./User";
import { Grant } from "./Grant";
import { simplify, getIntersection, isSuperset } from "scopeutils";

export interface TokenData {
  readonly id: string;
  readonly enabled: boolean;
  readonly userId: string;
  readonly grantId: null | string;
  readonly scopes: Iterable<string>;
}

export class Token implements TokenData {
  public readonly id: string;
  public readonly enabled: boolean;
  public readonly userId: string;
  public readonly grantId: null | string;
  public readonly scopes: string[];

  private _user: null | Promise<User> = null;
  private _grant: null | Promise<Grant> = null;

  public constructor(data: TokenData) {
    this.id = data.id;
    this.enabled = data.enabled;
    this.userId = data.userId;
    this.grantId = data.grantId;
    this.scopes = simplify([...data.scopes]);
  }

  public user(tx: PoolClient, refresh: boolean = false): Promise<User> {
    if (!refresh && this._user) {
      return this._user;
    }

    return (this._user = User.read(tx, this.userId));
  }

  public async grant(
    tx: PoolClient,
    refresh: boolean = false
  ): Promise<null | Grant> {
    if (!this.grantId) {
      return null;
    }

    if (!refresh && this._grant) {
      return this._grant;
    }

    return (this._grant = Grant.read(tx, this.grantId));
  }

  public async access(
    tx: PoolClient,
    refresh: boolean = false
  ): Promise<string[]> {
    return getIntersection(
      this.scopes,
      await (
        (await this.grant(tx, refresh)) || (await this.user(tx, refresh))
      ).access(tx, refresh)
    );
  }

  public async can(
    tx: PoolClient,
    scope: string[] | string,
    refresh: boolean = false
  ): Promise<boolean> {
    return isSuperset(await this.access(tx, refresh), scope);
  }

  public static read(tx: PoolClient, id: string): Promise<Token>;
  public static read(tx: PoolClient, id: string[]): Promise<Token[]>;
  public static async read(
    tx: PoolClient,
    id: string[] | string
  ): Promise<Token[] | Token> {
    if (typeof id !== "string" && !id.length) {
      return [];
    }

    const result = await tx.query(
      `
      SELECT
        entity_id AS id,
        enabled,
        user_id,
        grant_id,
        scopes
      FROM authx.token_record
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

    const tokens = result.rows.map(
      row =>
        new Token({
          ...row,
          userId: row.user_id,
          grantId: row.grant_id
        })
    );

    return typeof id === "string" ? tokens[0] : tokens;
  }

  public static async write(
    tx: PoolClient,
    data: TokenData,
    metadata: {
      recordId: string;
      createdByTokenId: string;
      createdAt: Date;
    }
  ): Promise<Token> {
    if (data.grantId) {
      const grant = await Grant.read(tx, data.grantId);
      if (grant.userId !== data.userId) {
        throw new Error(
          "If a token references a grant, it must belong to the same user as the token."
        );
      }
    }

    // ensure that the entity ID exists
    await tx.query(
      `
      INSERT INTO authx.token
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
      UPDATE authx.token_record
      SET replacement_record_id = $2
      WHERE
        entity_id = $1
        AND replacement_record_id IS NULL
      RETURNING entity_id AS id, record_id
      `,
      [data.id, metadata.recordId]
    );

    if (previous.rows.length > 1) {
      throw new Error(
        "INVARIANT: It must be impossible to replace more than one record."
      );
    }

    // insert the new record
    const next = await tx.query(
      `
      INSERT INTO authx.token_record
      (
        record_id,
        created_by_token_id,
        created_at,
        entity_id,
        enabled,
        user_id,
        grant_id,
        scopes
      )
      VALUES
        ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING
        entity_id AS id,
        enabled,
        user_id,
        grant_id,
        scopes
      `,
      [
        metadata.recordId,
        metadata.createdByTokenId,
        metadata.createdAt,
        data.id,
        data.enabled,
        data.userId,
        data.grantId,
        [...data.scopes]
      ]
    );

    if (next.rows.length !== 1) {
      throw new Error("INVARIANT: Insert must return exactly one row.");
    }

    const row = next.rows[0];
    return new Token({
      ...row,
      userId: row.user_id,
      grantId: row.grant_id
    });
  }
}
