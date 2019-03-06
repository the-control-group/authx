import { PoolClient } from "pg";
import { test } from "scopeutils";
import { User } from "./User";

export class AssignmentCollection implements Iterable<string> {
  private data: Map<string, null | Promise<User>> = new Map();
  public constructor(from?: Iterable<string>) {
    if (from) {
      for (const id of from) {
        this.data.set(id, null);
      }
    }
  }

  public add(
    id: string,
    cache: null | Promise<User> = null
  ): AssignmentCollection {
    this.data.set(id, cache);
    return this;
  }

  public delete(id: string): AssignmentCollection {
    this.data.delete(id);
    return this;
  }

  public has(id: string): boolean {
    return this.data.has(id);
  }

  public get(
    tx: PoolClient,
    id: string,
    refresh: boolean = false
  ): Promise<User> {
    const cache = refresh ? null : this.data.get(id);
    if (cache) {
      return cache;
    }

    const promise = (async () => {
      const users = await User.read(tx, [id]);
      if (users.length !== 1) {
        throw new Error("INVARIANT: Exactly one user must be returned.");
      }

      return users[0];
    })();

    this.data.set(id, promise);
    return promise;
  }

  public get size(): number {
    return this.data.size;
  }

  public *[Symbol.iterator](): Iterator<string> {
    yield* [...this.data.keys()].sort();
  }

  public toJSON(): string[] {
    return [...this];
  }
}

export class Role {
  public id: string;
  public enabled: boolean;
  public name: string;
  public assignments: AssignmentCollection;
  public scopes: Set<string>;

  public constructor(data: {
    id: string;
    enabled: boolean;
    name: string;
    scopes: Iterable<string>;
    assignments: Iterable<string>;
  }) {
    this.id = data.id;
    this.enabled = data.enabled;
    this.name = data.name;
    this.scopes = new Set(data.scopes);
    this.assignments = new AssignmentCollection(data.assignments);
  }

  public can(scope: string, strict: boolean = true): boolean {
    return test([...this.scopes], scope, strict);
  }

  public static async read(
    tx: PoolClient,
    id: string | string[]
  ): Promise<Role[]> {
    const result = await tx.query(
      `
      SELECT
        entity_id AS id,
        enabled,
        name,
        scopes,
        json_agg(role_record_assignment.user_id) AS assignments
      FROM authx.role_record
      LEFT JOIN role_record_assignment
        ON role_record_assignment.role_record_id = role_record.record_id
      WHERE entity_id = ANY($1) AND replacement_id IS NULL
      `,
      [id]
    );

    return result.rows.map(row => new Role(row));
  }

  public static async write(
    tx: PoolClient,
    data: Role,
    metadata: { recordId: string; createdByGrantId: string; createdAt: Date }
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
      SET replacement_id = $2
      WHERE entity_id = $1 AND replacement_id IS NULL
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
      INSERT INTO authx.role_record
      (
        id,
        created_by_grant_id,
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
        metadata.createdByGrantId,
        metadata.createdAt,
        data.id,
        data.enabled,
        data.name,
        data.scopes
      ]
    );

    if (next.rows.length !== 1) {
      throw new Error("INVARIANT: Insert must return exactly one row.");
    }

    // insert the new record's assignments
    const assignments = await tx.query(
      `
      INSERT INTO authx.role_record_assignment
        (role_record_id, user_id)
      SELECT $1::uuid AS role_record_id, user_id FROM UNNEST($2::uuid[]) AS user_id
      RETURNING user_id
      `,
      [metadata.recordId, [...data.assignments]]
    );

    if (assignments.rows.length !== data.assignments.size) {
      throw new Error(
        "INVARIANT: Assignments insert must return the same number of rows."
      );
    }

    return new Role({
      ...next.rows[0],
      assignments: assignments.rows.map(({ user_id: userId }) => userId)
    });
  }
}
