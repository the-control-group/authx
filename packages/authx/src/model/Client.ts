import { Pool, ClientBase } from "pg";
import { Grant } from "./Grant.js";
import { Authorization } from "./Authorization.js";
import { NotFoundError } from "../errors.js";
import { ClientAction, createV2AuthXScope } from "../util/scopes.js";
import { DataLoaderExecutor, DataLoaderCache, QueryCache } from "../loader.js";

export interface ClientInvocationData {
  readonly id: string;
  readonly entityId: string;
  readonly recordId: null | string;
  readonly createdAt: Date;
}

export class ClientInvocation implements ClientInvocationData {
  public readonly id: string;
  public readonly entityId: string;
  public readonly recordId: null | string;
  public readonly createdAt: Date;

  constructor(data: ClientInvocationData) {
    this.id = data.id;
    this.entityId = data.entityId;
    this.recordId = data.recordId;
    this.createdAt = data.createdAt;
  }
}

export interface ClientRecordData {
  readonly id: string;
  readonly replacementRecordId: null | string;
  readonly entityId: string;
  readonly createdAt: Date;
  readonly createdByAuthorizationId: string;
}

export class ClientRecord implements ClientRecordData {
  public readonly id: string;
  public readonly replacementRecordId: null | string;
  public readonly entityId: string;
  public readonly createdAt: Date;
  public readonly createdByAuthorizationId: string;

  constructor(data: ClientRecordData) {
    this.id = data.id;
    this.replacementRecordId = data.replacementRecordId;
    this.entityId = data.entityId;
    this.createdAt = data.createdAt;
    this.createdByAuthorizationId = data.createdByAuthorizationId;
  }
}

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
  public readonly recordId: string;
  public readonly enabled: boolean;
  public readonly name: string;
  public readonly description: string;
  public readonly secrets: Set<string>;
  public readonly urls: Set<string>;

  public constructor(data: ClientData & { readonly recordId: string }) {
    this.id = data.id;
    this.recordId = data.recordId;
    this.enabled = data.enabled;
    this.name = data.name;
    this.description = data.description;
    this.secrets = new Set(data.secrets);
    this.urls = new Set(data.urls);
  }

  public async isAccessibleBy(
    realm: string,
    a: Authorization,
    tx: Pool | ClientBase | DataLoaderExecutor,
    action: ClientAction = {
      basic: "r",
      secrets: "",
    },
  ): Promise<boolean> {
    if (
      await a.can(
        tx,
        realm,
        createV2AuthXScope(
          realm,
          {
            type: "client",
            clientId: this.id,
          },
          action,
        ),
      )
    ) {
      return true;
    }

    return false;
  }

  public async grants(
    tx: Pool | ClientBase | DataLoaderExecutor,
  ): Promise<Grant[]> {
    const ids = (
      await queryCache.query(
        tx,
        `
          SELECT entity_id AS id
          FROM authx.grant_record
          WHERE
            client_id = $1
            AND replacement_record_id IS NULL
          ORDER BY id ASC
          `,
        [this.id],
      )
    ).rows.map(({ id }) => id);

    return tx instanceof DataLoaderExecutor
      ? Grant.read(tx, ids)
      : Grant.read(tx, ids);
  }

  public async grant(
    tx: Pool | ClientBase | DataLoaderExecutor,
    userId: string,
  ): Promise<null | Grant> {
    const result = await queryCache.query(
      tx,
      `
      SELECT entity_id AS id
      FROM authx.grant_record
      WHERE
        user_id = $1
        AND client_id = $2
        AND replacement_record_id IS NULL
      `,
      [userId, this.id],
    );

    if (result.rows.length > 1) {
      throw new Error(
        "INVARIANT: It must be impossible for the same user and client to have multiple enabled grants.",
      );
    }

    if (result.rows.length) {
      return tx instanceof DataLoaderExecutor
        ? Grant.read(tx, result.rows[0].id)
        : Grant.read(tx, result.rows[0].id);
    }

    return null;
  }

  public async records(tx: ClientBase): Promise<ClientRecord[]> {
    const connection: Pool | ClientBase =
      tx instanceof DataLoaderExecutor ? tx.connection : tx;

    const result = await connection.query(
      `
      SELECT
        record_id as id,
        replacement_record_id,
        entity_id,
        created_by_authorization_id,
        created_by_credential_id,
        created_at,
      FROM authx.authorization_record
      WHERE entity_id = $1
      ORDER BY created_at DESC
      `,
      [this.id],
    );

    return result.rows.map(
      (row) =>
        new ClientRecord({
          ...row,
          replacementRecordId: row.replacement_record_id,
          createdByAuthorizationId: row.created_by_authorization_id,
          createdAt: row.created_at,
          entityId: row.entity_id,
        }),
    );
  }

  public async invoke(
    tx: Pool | ClientBase | DataLoaderExecutor,
    data: {
      id: string;
      createdAt: Date;
    },
  ): Promise<ClientInvocation> {
    // insert the new invocation
    const result = await (
      tx instanceof DataLoaderExecutor ? tx.connection : tx
    ).query(
      `
      INSERT INTO authx.client_invocation
      (
        invocation_id,
        entity_id,
        record_id,
        created_at
      )
      VALUES
        ($1, $2, $3, $4)
      RETURNING
        invocation_id AS id,
        entity_id,
        record_id,
        created_at
      `,
      [data.id, this.id, this.recordId, data.createdAt] as any[],
    );

    if (result.rows.length !== 1) {
      throw new Error("INVARIANT: Insert must return exactly one row.");
    }

    const row = result.rows[0];

    return new ClientInvocation({
      id: row.id,
      entityId: row.entity_id,
      recordId: row.record_id,
      createdAt: row.created_at,
    });
  }

  public async invocations(tx: ClientBase): Promise<ClientInvocation[]> {
    const connection: Pool | ClientBase =
      tx instanceof DataLoaderExecutor ? tx.connection : tx;

    const result = await connection.query(
      `
      SELECT
        invocation_id as id,
        record_id,
        entity_id,
        created_at
      FROM authx.client_invocation
      WHERE entity_id = $1
      ORDER BY created_at DESC
      `,
      [this.id],
    );

    return result.rows.map(
      (row) =>
        new ClientInvocation({
          ...row,
          recordId: row.record_id,
          entityId: row.entity_id,
          createdAt: row.created_at,
        }),
    );
  }

  public static read(
    tx: Pool | ClientBase | DataLoaderExecutor,
    id: string,
    options?: { forUpdate?: boolean },
  ): Promise<Client>;

  public static read(
    tx: Pool | ClientBase | DataLoaderExecutor,
    id: readonly string[],
    options?: { forUpdate?: boolean },
  ): Promise<Client[]>;

  public static async read(
    tx: Pool | ClientBase | DataLoaderExecutor,
    id: readonly string[] | string,
    options?: { forUpdate?: boolean },
  ): Promise<Client[] | Client> {
    if (tx instanceof DataLoaderExecutor) {
      const loader = cache.get(tx);

      // Load a single instance.
      if (typeof id === "string") {
        return loader.load(id);
      }

      // Load multiple instances.
      return Promise.all(id.map((i) => loader.load(i)));
    }

    if (typeof id !== "string" && !id.length) {
      return [];
    }

    if (options?.forUpdate) {
      await tx.query(
        `SELECT id FROM authx.client WHERE id = ANY($1) FOR UPDATE`,
        [typeof id === "string" ? [id] : id],
      );
    }

    const result = await tx.query(
      `
      SELECT
        entity_id AS id,
        record_id,
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
        ${options?.forUpdate ? "FOR UPDATE" : ""}
      ) AS client_record
      `,
      [typeof id === "string" ? [id] : id],
    );

    if (result.rows.length > (typeof id === "string" ? 1 : id.length)) {
      throw new Error(
        "INVARIANT: Read must never return more records than requested.",
      );
    }

    if (result.rows.length < (typeof id === "string" ? 1 : id.length)) {
      throw new NotFoundError();
    }

    const clients = result.rows.map(
      (row) =>
        new Client({
          ...row,
          recordId: row.record_id,
          secrets: row.secrets,
          urls: row.urls,
        }),
    );

    return typeof id === "string" ? clients[0] : clients;
  }

  public static async write(
    tx: Pool | ClientBase,
    data: ClientData,
    metadata: {
      recordId: string;
      createdByAuthorizationId: string;
      createdAt: Date;
    },
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
      [data.id],
    );

    // replace the previous record
    const previous = await tx.query(
      `
      UPDATE authx.client_record
      SET replacement_record_id = $2
      WHERE entity_id = $1 AND replacement_record_id IS NULL
      RETURNING entity_id AS id, record_id
      `,
      [data.id, metadata.recordId],
    );

    if (previous.rows.length > 1) {
      throw new Error(
        "INVARIANT: It must be impossible to replace more than one record.",
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
        record_id,
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
        [...new Set(data.urls)],
      ] as any[],
    );

    if (next.rows.length !== 1) {
      throw new Error("INVARIANT: Insert must return exactly one row.");
    }

    const row = next.rows[0];
    return new Client({
      ...row,
      recordId: row.record_id,
      secrets: row.secrets,
      urls: row.urls,
    });
  }

  public static clear(executor: DataLoaderExecutor, id: string): void {
    cache.get(executor).clear(id);
  }

  public static prime(
    executor: DataLoaderExecutor,
    id: string,
    value: Client,
  ): void {
    cache.get(executor).prime(id, value);
  }
}

const cache = new DataLoaderCache(
  async (
    executor: DataLoaderExecutor,
    ids: readonly string[],
  ): Promise<Client[]> => {
    return Client.read(executor.connection, ids);
  },
);

const queryCache = new QueryCache<{ id: string }>();
