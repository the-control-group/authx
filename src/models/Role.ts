import { PoolClient } from "pg";
import { User } from "./User";
import { Token } from "./Token";
import { simplify, isSuperset, isStrictSuperset } from "scopeutils";
import { NotFoundError } from "../errors";

export interface RoleData {
  readonly id: string;
  readonly enabled: boolean;
  readonly name: string;
  readonly scopes: Iterable<string>;
  readonly userIds: Iterable<string>;
}

export class Role implements RoleData {
  public readonly id: string;
  public readonly enabled: boolean;
  public readonly name: string;
  public readonly scopes: string[];
  public readonly userIds: Set<string>;

  private _users: null | Promise<User[]> = null;

  public constructor(data: RoleData) {
    this.id = data.id;
    this.enabled = data.enabled;
    this.name = data.name;
    this.scopes = simplify([...data.scopes]);
    this.userIds = new Set(data.userIds);
  }

  public async isAccessibleBy(
    realm: string,
    t: Token,
    tx: PoolClient,
    action: string = "read.basic"
  ): Promise<boolean> {
    // can view all roles
    if (await t.can(tx, `${realm}:role.*.*:${action}`)) {
      return true;
    }

    // can view assigned roles
    if (
      this.userIds.has(t.userId) &&
      (await t.can(tx, `${realm}:role.equal.assigned:${action}`))
    ) {
      return true;
    }

    // can view roles with lesser or equal access
    if (await t.can(tx, `${realm}:role.equal.*:${action}`)) {
      return isSuperset(await (await t.user(tx)).access(tx), this.access());
    }

    // can view roles with lesser access
    if (await t.can(tx, `${realm}:role.equal.lesser:${action}`)) {
      return isStrictSuperset(
        await (await t.user(tx)).access(tx),
        this.access()
      );
    }

    return false;
  }

  public users(tx: PoolClient, refresh: boolean = false): Promise<User[]> {
    if (!refresh && this._users) {
      return this._users;
    }

    return (this._users = User.read(tx, [...this.userIds]));
  }

  public access(): string[] {
    return this.scopes;
  }

  public async can(tx: PoolClient, scope: string[] | string): Promise<boolean> {
    return isSuperset(this.access(), scope);
  }

  public static read(tx: PoolClient, id: string): Promise<Role>;
  public static read(tx: PoolClient, id: string[]): Promise<Role[]>;
  public static async read(
    tx: PoolClient,
    id: string[] | string
  ): Promise<Role[] | Role> {
    if (typeof id !== "string" && !id.length) {
      return [];
    }

    const result = await tx.query(
      `
      SELECT
        entity_id AS id,
        enabled,
        name,
        scopes,
        json_agg(authx.role_record_user.user_id) AS user_ids
      FROM authx.role_record
      LEFT JOIN authx.role_record_user
        ON authx.role_record_user.role_record_id = authx.role_record.record_id
      WHERE
        authx.role_record.entity_id = ANY($1)
        AND authx.role_record.replacement_record_id IS NULL
      GROUP BY
        authx.role_record.entity_id,
        authx.role_record.enabled,
        authx.role_record.name,
        authx.role_record.scopes
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
          userIds: row.user_ids.filter((id: null | string) => id)
        })
    );

    return typeof id === "string" ? roles[0] : roles;
  }

  public static async write(
    tx: PoolClient,
    data: RoleData,
    metadata: { recordId: string; createdByTokenId: string; createdAt: Date }
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

    // insert the new record
    const next = await tx.query(
      `
      INSERT INTO authx.role_record
      (
        record_id,
        created_by_token_id,
        created_at,
        entity_id,
        enabled,
        name,
        scopes
      )
      VALUES
        ($1, $2, $3, $4, $5, $6, $7)
      RETURNING
        entity_id AS id,
        enabled,
        name,
        scopes
      `,
      [
        metadata.recordId,
        metadata.createdByTokenId,
        metadata.createdAt,
        data.id,
        data.enabled,
        data.name,
        simplify([...data.scopes])
      ]
    );

    if (next.rows.length !== 1) {
      throw new Error("INVARIANT: Insert must return exactly one row.");
    }

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
      ...next.rows[0],
      userIds: users.rows.map(({ user_id: userId }) => userId)
    });
  }
}
