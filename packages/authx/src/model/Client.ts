import { PoolClient } from "pg";
import { Grant } from "./Grant";
import { Authorization } from "./Authorization";
import { NotFoundError } from "../errors";
import { ClientAction, createV2AuthXScope } from "../util/scopes";

export interface ClientData {
  readonly id: string;
  readonly enabled: boolean;
  readonly name: string;
  readonly description: string;
  readonly secrets: Iterable<string>;
  readonly urls: Iterable<string>;
}

export class Client implements ClientData {
  public readonly id: string;
  public readonly enabled: boolean;
  public readonly name: string;
  public readonly description: string;
  public readonly secrets: Set<string>;
  public readonly urls: Set<string>;

  private _grants: null | Promise<Grant[]> = null;

  public constructor(data: ClientData) {
    this.id = data.id;
    this.enabled = data.enabled;
    this.name = data.name;
    this.description = data.description;
    this.secrets = new Set(data.secrets);
    this.urls = new Set(data.urls);
  }

  public async isAccessibleBy(
    realm: string,
    a: Authorization,
    tx: PoolClient,
    action: ClientAction = {
      basic: "r",
      secrets: ""
    }
  ): Promise<boolean> {
    const values = {
      currentAuthorizationId: a.id,
      currentUserId: a.userId,
      currentGrantId: a.grantId ?? null,
      currentClientId: (await a.grant(tx))?.clientId ?? null
    };

    if (
      await a.can(
        tx,
        values,
        createV2AuthXScope(
          realm,
          {
            type: "client",
            clientId: this.id
          },
          action
        )
      )
    ) {
      return true;
    }

    return false;
  }

  public grants(tx: PoolClient, refresh: boolean = true): Promise<Grant[]> {
    if (!refresh && this._grants) {
      return this._grants;
    }

    return (this._grants = (async () =>
      Grant.read(
        tx,
        (
          await tx.query(
            `
            SELECT entity_id AS id
            FROM authx.grant_record
            WHERE
              client_id = $1
              AND replacement_record_id IS NULL
            `,
            [this.id]
          )
        ).rows.map(({ id }) => id)
      ))());
  }

  public async grant(tx: PoolClient, userId: string): Promise<null | Grant> {
    const result = await tx.query(
      `
      SELECT entity_id AS id
      FROM authx.grant_record
      WHERE
        user_id = $1
        AND client_id = $2
        AND replacement_record_id IS NULL
      `,
      [userId, this.id]
    );

    if (result.rows.length > 1) {
      throw new Error(
        "INVARIANT: It must be impossible for the same user and client to have multiple enabled grants.."
      );
    }

    if (result.rows.length) {
      return Grant.read(tx, result.rows[0].id);
    }

    return null;
  }

  public static read(
    tx: PoolClient,
    id: string,
    options?: { forUpdate: boolean }
  ): Promise<Client>;
  public static read(
    tx: PoolClient,
    id: string[],
    options?: { forUpdate: boolean }
  ): Promise<Client[]>;
  public static async read(
    tx: PoolClient,
    id: string[] | string,
    options: { forUpdate: boolean } = { forUpdate: false }
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
        description,
        secrets,
        urls
      FROM (
        SELECT *
        FROM authx.client_record
        WHERE
          entity_id = ANY($1)
          AND replacement_record_id IS NULL
        ${options.forUpdate ? "FOR UPDATE" : ""}
      ) AS client_record
      `,
      [typeof id === "string" ? [id] : id]
    );

    if (result.rows.length > (typeof id === "string" ? 1 : id.length)) {
      throw new Error(
        "INVARIANT: Read must never return more records than requested."
      );
    }

    if (result.rows.length < (typeof id === "string" ? 1 : id.length)) {
      throw new NotFoundError();
    }

    const clients = result.rows.map(
      row =>
        new Client({
          ...row,
          secrets: row.secrets,
          urls: row.urls
        })
    );

    return typeof id === "string" ? clients[0] : clients;
  }

  public static async write(
    tx: PoolClient,
    data: ClientData,
    metadata: {
      recordId: string;
      createdByAuthorizationId: string;
      createdAt: Date;
    }
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

    if (previous.rows.length > 1) {
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
        created_by_authorization_id,
        created_at,
        entity_id,
        enabled,
        name,
        description,
        secrets,
        urls
      )
      VALUES
        ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING
        entity_id AS id,
        enabled,
        name,
        description,
        secrets,
        urls
      `,
      [
        metadata.recordId,
        metadata.createdByAuthorizationId,
        metadata.createdAt,
        data.id,
        data.enabled,
        data.name,
        data.description,
        [...new Set(data.secrets)],
        [...new Set(data.urls)]
      ]
    );

    if (next.rows.length !== 1) {
      throw new Error("INVARIANT: Insert must return exactly one row.");
    }

    const row = next.rows[0];
    return new Client({
      ...row,
      secrets: row.secrets,
      urls: row.urls
    });
  }
}
