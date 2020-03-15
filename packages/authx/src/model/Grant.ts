import { ClientBase } from "pg";
import { Client } from "./Client";
import { User } from "./User";
import { Authorization } from "./Authorization";
import { simplify, getIntersection, isSuperset } from "@authx/scopes";
import { NotFoundError } from "../errors";
import { GrantAction, createV2AuthXScope } from "../util/scopes";
import { DataLoaderCacheKey, DataLoaderCache } from "../loader";

export interface GrantInvocationData {
  readonly id: string;
  readonly entityId: string;
  readonly recordId: null | string;
  readonly createdAt: Date;
}

export class GrantInvocation implements GrantInvocationData {
  public readonly id: string;
  public readonly entityId: string;
  public readonly recordId: null | string;
  public readonly createdAt: Date;

  constructor(data: GrantInvocationData) {
    this.id = data.id;
    this.entityId = data.entityId;
    this.recordId = data.recordId;
    this.createdAt = data.createdAt;
  }
}

export interface GrantRecordData {
  readonly id: string;
  readonly replacementRecordId: null | string;
  readonly entityId: string;
  readonly createdAt: Date;
  readonly createdByAuthorizationId: string;
}

export class GrantRecord implements GrantRecordData {
  public readonly id: string;
  public readonly replacementRecordId: null | string;
  public readonly entityId: string;
  public readonly createdAt: Date;
  public readonly createdByAuthorizationId: string;

  constructor(data: GrantRecordData) {
    this.id = data.id;
    this.replacementRecordId = data.replacementRecordId;
    this.entityId = data.entityId;
    this.createdAt = data.createdAt;
    this.createdByAuthorizationId = data.createdByAuthorizationId;
  }
}

export interface GrantData {
  readonly id: string;
  readonly enabled: boolean;
  readonly clientId: string;
  readonly userId: string;
  readonly secrets: Iterable<string>;
  readonly codes: Iterable<string>;
  readonly scopes: Iterable<string>;
}

export class Grant implements GrantData {
  public readonly id: string;
  public readonly recordId: string;
  public readonly enabled: boolean;
  public readonly clientId: string;
  public readonly userId: string;
  public readonly secrets: Set<string>;
  public readonly codes: Set<string>;
  public readonly scopes: string[];

  private _client: null | Promise<Client> = null;
  private _user: null | Promise<User> = null;
  private _authorizations: null | Promise<Authorization[]> = null;

  public constructor(data: GrantData & { readonly recordId: string }) {
    this.id = data.id;
    this.recordId = data.recordId;
    this.enabled = data.enabled;
    this.clientId = data.clientId;
    this.userId = data.userId;
    this.secrets = new Set(data.secrets);
    this.codes = new Set(data.codes);
    this.scopes = simplify([...data.scopes]);
  }

  public async isAccessibleBy(
    realm: string,
    a: Authorization,
    tx: ClientBase,
    action: GrantAction = {
      basic: "r",
      scopes: "",
      secrets: ""
    }
  ): Promise<boolean> {
    if (
      await a.can(
        tx,
        createV2AuthXScope(
          realm,
          {
            type: "grant",
            grantId: this.id,
            userId: this.userId,
            clientId: this.clientId
          },
          action
        )
      )
    ) {
      return true;
    }

    return false;
  }

  public client(tx: ClientBase, refresh: boolean = false): Promise<Client> {
    if (!refresh && this._client) {
      return this._client;
    }

    return (this._client = Client.read(tx, this.clientId));
  }

  public user(tx: ClientBase, refresh: boolean = false): Promise<User> {
    if (!refresh && this._user) {
      return this._user;
    }
    return (this._user = User.read(tx, this.userId));
  }

  public async authorizations(
    tx: ClientBase,
    refresh: boolean = false
  ): Promise<Authorization[]> {
    if (!refresh && this._authorizations) {
      return this._authorizations;
    }

    return (this._authorizations = (async () =>
      Authorization.read(
        tx,
        (
          await tx.query(
            `
          SELECT entity_id AS id
          FROM authx.authorization_record
          WHERE
            grant_id = $1
            AND replacement_record_id IS NULL
          `,
            [this.id]
          )
        ).rows.map(({ id }) => id)
      ))());
  }

  public async access(
    tx: ClientBase,
    values: {
      currentAuthorizationId: null | string;
      currentUserId: null | string;
      currentGrantId: null | string;
      currentClientId: null | string;
    },
    refresh: boolean = false
  ): Promise<string[]> {
    const user = await this.user(tx, refresh);
    return user.enabled
      ? getIntersection(this.scopes, await user.access(tx, values, refresh))
      : [];
  }

  public async can(
    tx: ClientBase,
    values: {
      currentAuthorizationId: null | string;
      currentUserId: null | string;
      currentGrantId: null | string;
      currentClientId: null | string;
    },
    scope: string,
    refresh: boolean = false
  ): Promise<boolean> {
    return isSuperset(await this.access(tx, values, refresh), scope);
  }

  public async records(tx: ClientBase): Promise<GrantRecord[]> {
    const result = await tx.query(
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
      [this.id]
    );

    return result.rows.map(
      row =>
        new GrantRecord({
          ...row,
          replacementRecordId: row.replacement_record_id,
          createdByAuthorizationId: row.created_by_authorization_id,
          createdAt: row.created_at,
          entityId: row.entity_id
        })
    );
  }

  public async invoke(
    tx: ClientBase,
    data: {
      id: string;
      createdAt: Date;
    }
  ): Promise<GrantInvocation> {
    // insert the new invocation
    const result = await tx.query(
      `
      INSERT INTO authx.grant_invocation
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
      [data.id, this.id, this.recordId, data.createdAt]
    );

    if (result.rows.length !== 1) {
      throw new Error("INVARIANT: Insert must return exactly one row.");
    }

    const row = result.rows[0];

    return new GrantInvocation({
      id: row.id,
      entityId: row.entity_id,
      recordId: row.record_id,
      createdAt: row.created_at
    });
  }

  public async invocations(tx: ClientBase): Promise<GrantInvocation[]> {
    const result = await tx.query(
      `
      SELECT
        invocation_id as id,
        record_id,
        entity_id,
        created_at
      FROM authx.grant_invocation
      WHERE entity_id = $1
      ORDER BY created_at DESC
      `,
      [this.id]
    );

    return result.rows.map(
      row =>
        new GrantInvocation({
          ...row,
          recordId: row.record_id,
          entityId: row.entity_id,
          createdAt: row.created_at
        })
    );
  }

  public static read(
    tx: ClientBase | DataLoaderCacheKey,
    id: string,
    options?: { forUpdate: boolean }
  ): Promise<Grant>;
  public static read(
    tx: ClientBase | DataLoaderCacheKey,
    id: string[],
    options?: { forUpdate: boolean }
  ): Promise<Grant[]>;
  public static async read(
    tx: ClientBase | DataLoaderCacheKey,
    id: string[] | string,
    options: { forUpdate: boolean } = { forUpdate: false }
  ): Promise<Grant[] | Grant> {
    if (tx instanceof DataLoaderCacheKey) {
      const loader = this._cache.get(tx);
      return Promise.all(
        typeof id === "string" ? [loader.load(id)] : id.map(i => loader.load(i))
      );
    }

    if (typeof id !== "string" && !id.length) {
      return [];
    }

    const result = await tx.query(
      `
      SELECT
        entity_id AS id,
        record_id,
        enabled,
        client_id,
        user_id,
        secrets,
        codes,
        scopes
      FROM authx.grant_record
      WHERE
        entity_id = ANY($1)
        AND replacement_record_id IS NULL
      ${options.forUpdate ? "FOR UPDATE" : ""}
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

    const grants = result.rows.map(
      row =>
        new Grant({
          ...row,
          recordId: row.record_id,
          clientId: row.client_id,
          userId: row.user_id
        })
    );

    return typeof id === "string" ? grants[0] : grants;
  }

  public static async write(
    tx: ClientBase,
    data: GrantData,
    metadata: {
      recordId: string;
      createdByAuthorizationId: string;
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

    if (previous.rows.length > 1) {
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
        created_by_authorization_id,
        created_at,
        entity_id,
        enabled,
        client_id,
        user_id,
        secrets,
        codes,
        scopes
      )
      VALUES
        ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING
        entity_id AS id,
        record_id,
        enabled,
        client_id,
        user_id,
        secrets,
        codes,
        scopes
      `,
      [
        metadata.recordId,
        metadata.createdByAuthorizationId,
        metadata.createdAt,
        data.id,
        data.enabled,
        data.clientId,
        data.userId,
        [...new Set(data.secrets)],
        [...new Set(data.codes)],
        simplify([...data.scopes])
      ]
    );

    if (next.rows.length !== 1) {
      throw new Error("INVARIANT: Insert must return exactly one row.");
    }

    const row = next.rows[0];
    return new Grant({
      ...row,
      recordId: row.record_id,
      clientId: row.client_id,
      userId: row.user_id
    });
  }

  private static readonly _cache = new DataLoaderCache(Grant);
}
