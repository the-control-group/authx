import { PoolClient } from "pg";
import { Grant } from "./Grant";
import { simplify, getIntersection, isSuperset } from "scopeutils";

export interface TokenData {
  readonly id: string;
  readonly enabled: boolean;
  readonly grantId: string;
  readonly scopes: Iterable<string>;
}

export class Token implements TokenData {
  public readonly id: string;
  public readonly enabled: boolean;
  public readonly grantId: string;
  public readonly scopes: string[];

  private _grant: null | Promise<Grant> = null;

  public constructor(data: TokenData) {
    this.id = data.id;
    this.enabled = data.enabled;
    this.grantId = data.grantId;
    this.scopes = simplify([...data.scopes]);
  }

  public grant(tx: PoolClient, refresh: boolean = false): Promise<Grant> {
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
      await (await this.grant(tx, refresh)).access(tx, refresh)
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
        metadata.createdByTokenId,
        metadata.createdAt,
        data.id,
        data.enabled,
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
      grantId: row.grant_id
    });
  }
}
