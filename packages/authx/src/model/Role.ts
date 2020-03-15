import { Pool, ClientBase } from "pg";
import { User } from "./User";
import { Authorization } from "./Authorization";
import { simplify, isSuperset, inject } from "@authx/scopes";
import { NotFoundError } from "../errors";
import { RoleAction, createV2AuthXScope } from "../util/scopes";
import { DataLoaderExecutor, DataLoaderCache } from "../loader";

export interface RoleRecordData {
  readonly id: string;
  readonly replacementRecordId: null | string;
  readonly entityId: string;
  readonly createdAt: Date;
  readonly createdByAuthorizationId: string;
}

export class RoleRecord implements RoleRecordData {
  public readonly id: string;
  public readonly replacementRecordId: null | string;
  public readonly entityId: string;
  public readonly createdAt: Date;
  public readonly createdByAuthorizationId: string;

  constructor(data: RoleRecordData) {
    this.id = data.id;
    this.replacementRecordId = data.replacementRecordId;
    this.entityId = data.entityId;
    this.createdAt = data.createdAt;
    this.createdByAuthorizationId = data.createdByAuthorizationId;
  }
}

export interface RoleData {
  readonly id: string;
  readonly enabled: boolean;
  readonly name: string;
  readonly description: string;
  readonly scopes: Iterable<string>;
  readonly userIds: Iterable<string>;
}

export class Role implements RoleData {
  public readonly id: string;
  public readonly recordId: string;
  public readonly enabled: boolean;
  public readonly name: string;
  public readonly description: string;
  public readonly scopes: string[];
  public readonly userIds: Set<string>;

  private _users: null | Promise<User[]> = null;

  public constructor(data: RoleData & { readonly recordId: string }) {
    this.id = data.id;
    this.recordId = data.recordId;
    this.enabled = data.enabled;
    this.name = data.name;
    this.description = data.description;
    this.scopes = simplify([...data.scopes]);
    this.userIds = new Set(data.userIds);
  }

  public async isAccessibleBy(
    realm: string,
    a: Authorization,
    tx: Pool | ClientBase | DataLoaderExecutor,
    action: RoleAction = {
      basic: "r",
      scopes: "",
      users: ""
    }
  ): Promise<boolean> {
    if (
      await a.can(
        tx,
        createV2AuthXScope(
          realm,
          {
            type: "role",
            roleId: this.id
          },
          action
        )
      )
    ) {
      return true;
    }

    return false;
  }

  public users(
    tx: Pool | ClientBase | DataLoaderExecutor,
    refresh: boolean = false
  ): Promise<User[]> {
    if (!refresh && this._users) {
      return this._users;
    }

    return (this._users = User.read(tx, [...this.userIds]));
  }

  public access(values: {
    currentAuthorizationId: null | string;
    currentUserId: null | string;
    currentGrantId: null | string;
    currentClientId: null | string;
  }): string[] {
    return inject(this.scopes, {
      /* eslint-disable @typescript-eslint/camelcase */
      current_authorization_id: values.currentAuthorizationId,
      current_user_id: values.currentUserId,
      current_grant_id: values.currentGrantId,
      current_client_id: values.currentClientId
      /* eslint-enable @typescript-eslint/camelcase */
    });
  }

  public async can(
    values: {
      currentAuthorizationId: null | string;
      currentUserId: null | string;
      currentGrantId: null | string;
      currentClientId: null | string;
    },
    scope: string[] | string
  ): Promise<boolean> {
    return isSuperset(this.access(values), scope);
  }

  public async records(tx: ClientBase): Promise<RoleRecord[]> {
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
        new RoleRecord({
          ...row,
          replacementRecordId: row.replacement_record_id,
          createdByAuthorizationId: row.created_by_authorization_id,
          createdAt: row.created_at,
          entityId: row.entity_id
        })
    );
  }

  public static read(
    tx: Pool | ClientBase | DataLoaderExecutor,
    id: string,
    options?: { forUpdate: boolean }
  ): Promise<Role>;
  public static read(
    tx: Pool | ClientBase | DataLoaderExecutor,
    id: string[],
    options?: { forUpdate: boolean }
  ): Promise<Role[]>;
  public static async read(
    tx: Pool | ClientBase | DataLoaderExecutor,
    id: string[] | string,
    options: { forUpdate: boolean } = { forUpdate: false }
  ): Promise<Role[] | Role> {
    if (tx instanceof DataLoaderExecutor) {
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
        name,
        description,
        scopes,
        json_agg(authx.role_record_user.user_id) AS user_ids
      FROM (
        SELECT *
        FROM authx.role_record
        WHERE
          authx.role_record.entity_id = ANY($1)
          AND authx.role_record.replacement_record_id IS NULL
        ${options.forUpdate ? "FOR UPDATE" : ""}
      ) AS role_record
      LEFT JOIN authx.role_record_user
        ON authx.role_record_user.role_record_id = role_record.record_id
      GROUP BY
        role_record.entity_id,
        role_record.record_id,
        role_record.enabled,
        role_record.name,
        role_record.description,
        role_record.scopes
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

    const roles = result.rows.map(
      row =>
        new Role({
          ...row,
          recordId: row.record_id,
          userIds: row.user_ids.filter((id: null | string) => id)
        })
    );

    return typeof id === "string" ? roles[0] : roles;
  }

  public static async write(
    tx: Pool | ClientBase | DataLoaderExecutor,
    data: RoleData,
    metadata: {
      recordId: string;
      createdByAuthorizationId: string;
      createdAt: Date;
    }
  ): Promise<Role> {
    if (tx instanceof DataLoaderExecutor) {
      const result = await this.write(tx.tx, data, metadata);

      this._cache
        .get(tx)
        .clear(result.id)
        .prime(result.id, result);

      return result;
    }

    // ensure that the entity ID exists
    await tx.query(
      `
      INSERT INTO authx.role
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
      UPDATE authx.role_record
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
      INSERT INTO authx.role_record
      (
        record_id,
        created_by_authorization_id,
        created_at,
        entity_id,
        enabled,
        name,
        description,
        scopes
      )
      VALUES
        ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING
        entity_id AS id,
        record_id,
        enabled,
        name,
        description,
        scopes
      `,
      [
        metadata.recordId,
        metadata.createdByAuthorizationId,
        metadata.createdAt,
        data.id,
        data.enabled,
        data.name,
        data.description,
        simplify([...data.scopes])
      ]
    );

    if (next.rows.length !== 1) {
      throw new Error("INVARIANT: Insert must return exactly one row.");
    }

    const row = next.rows[0];

    // insert the new record's users
    const userIds = [...new Set(data.userIds)];
    const users = await tx.query(
      `
      INSERT INTO authx.role_record_user
        (role_record_id, user_id)
      SELECT $1::uuid AS role_record_id, user_id FROM UNNEST($2::uuid[]) AS user_id
      RETURNING user_id
      `,
      [metadata.recordId, userIds]
    );

    if (users.rows.length !== userIds.length) {
      throw new Error(
        "INVARIANT: Insert or user IDs must return the same number of rows as input."
      );
    }

    return new Role({
      ...row,
      recordId: row.record_id,
      userIds: users.rows.map(({ user_id: userId }) => userId)
    });
  }

  private static readonly _cache = new DataLoaderCache(Role);
}
