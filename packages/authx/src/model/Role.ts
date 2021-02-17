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
      users: "",
    }
  ): Promise<boolean> {
    if (
      await a.can(
        tx,
        realm,
        createV2AuthXScope(
          realm,
          {
            type: "role",
            roleId: this.id,
          },
          action
        )
      )
    ) {
      return true;
    }

    return false;
  }

  public users(tx: Pool | ClientBase | DataLoaderExecutor): Promise<User[]> {
    return (
      // Some silliness to help typescript...
      tx instanceof DataLoaderExecutor
        ? User.read(tx, [...this.userIds].sort())
        : User.read(tx, [...this.userIds].sort())
    );
  }

  public access(values: {
    currentAuthorizationId: null | string;
    currentUserId: null | string;
    currentGrantId: null | string;
    currentClientId: null | string;
  }): string[] {
    if (!this.enabled) {
      return [];
    }

    return inject(this.scopes, {
      /* eslint-disable camelcase */
      current_authorization_id: values.currentAuthorizationId,
      current_user_id: values.currentUserId,
      current_grant_id: values.currentGrantId,
      current_client_id: values.currentClientId,
      /* eslint-enable camelcase */
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
      (row) =>
        new RoleRecord({
          ...row,
          replacementRecordId: row.replacement_record_id,
          createdByAuthorizationId: row.created_by_authorization_id,
          createdAt: row.created_at,
          entityId: row.entity_id,
        })
    );
  }

  // Read using an executor.
  public static read(
    tx: DataLoaderExecutor,
    id: string,
    options?: { forUpdate?: false }
  ): Promise<Role>;

  public static read(
    tx: DataLoaderExecutor,
    id: readonly string[],
    options?: { forUpdate?: false }
  ): Promise<Role[]>;

  // Read using a connection.
  public static read(
    tx: Pool | ClientBase,
    id: string,
    options?: { forUpdate?: boolean }
  ): Promise<Role>;

  public static read(
    tx: Pool | ClientBase,
    id: readonly string[],
    options?: { forUpdate?: boolean }
  ): Promise<Role[]>;

  public static async read(
    tx: Pool | ClientBase | DataLoaderExecutor,
    id: readonly string[] | string,
    options?: { forUpdate?: boolean }
  ): Promise<Role[] | Role> {
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
        `SELECT id FROM authx.role WHERE id = ANY($1) FOR UPDATE`,
        [typeof id === "string" ? [id] : id]
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
        scopes,
        json_agg(authx.role_record_user.user_id) AS user_ids
      FROM (
        SELECT *
        FROM authx.role_record
        WHERE
          authx.role_record.entity_id = ANY($1)
          AND authx.role_record.replacement_record_id IS NULL
        ${options?.forUpdate ? "FOR UPDATE" : ""}
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
      (row) =>
        new Role({
          ...row,
          recordId: row.record_id,
          userIds: row.user_ids.filter((id: null | string) => id),
        })
    );

    return typeof id === "string" ? roles[0] : roles;
  }

  public static async write(
    tx: Pool | ClientBase,
    data: RoleData,
    metadata: {
      recordId: string;
      createdByAuthorizationId: string;
      createdAt: Date;
    }
  ): Promise<Role> {
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

    const previousRoleRecordId = previous.rows[0]?.record_id ?? null;

    // replace the previous record's users
    if (previousRoleRecordId) {
      const previousUsers = await tx.query(
        `
        UPDATE authx.role_record_user
        SET role_replacement_record_id = $2
        WHERE role_record_id = $1 AND role_replacement_record_id IS NULL
        RETURNING role_record_id
        `,
        [previousRoleRecordId, metadata.recordId]
      );

      for (const row of previousUsers.rows as { role_record_id: string }[]) {
        if (row.role_record_id !== previousRoleRecordId) {
          throw new Error(
            "INVARIANT: It must be impossible for a different role's users to be updated."
          );
        }
      }
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
        simplify([...data.scopes]),
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
      userIds: users.rows.map(({ user_id: userId }) => userId),
    });
  }

  public static clear(executor: DataLoaderExecutor, id: string): void {
    cache.get(executor).clear(id);
  }

  public static prime(
    executor: DataLoaderExecutor,
    id: string,
    value: Role
  ): void {
    cache.get(executor).prime(id, value);
  }
}

const cache = new DataLoaderCache(
  async (
    executor: DataLoaderExecutor,
    ids: readonly string[]
  ): Promise<Role[]> => {
    return Role.read(executor.connection, ids);
  }
);
