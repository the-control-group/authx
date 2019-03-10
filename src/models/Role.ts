import { PoolClient } from "pg";
import { test } from "scopeutils";
import { User } from "./User";

export class AssignmentCollection
  implements Iterable<(tx: PoolClient, refresh: boolean) => Promise<User>> {
  private data: Map<string, null | Promise<User>> = new Map();

  public constructor(from?: AssignmentCollection | Iterable<string>) {
    if (from instanceof AssignmentCollection) {
      for (const id of from.keys()) {
        this.data.set(id, null);
      }
    } else if (from) {
      for (const id of from) {
        this.data.set(id, null);
      }
    }
  }

  private get(
    id: string,
    tx: PoolClient,
    refresh: boolean = false
  ): Promise<User> {
    const cache = refresh ? null : this.data.get(id);
    if (cache) {
      return cache;
    }

    const promise = (async () => {
      return User.read(tx, id);
    })();

    this.data.set(id, promise);
    return promise;
  }

  public get size(): number {
    return this.data.size;
  }

  public has(id: string): boolean {
    return this.data.has(id);
  }

  public keys(): Iterable<string> {
    return [...this.data.keys()].sort();
  }

  public *[Symbol.iterator](): Iterator<
    (tx: PoolClient, refresh: boolean) => Promise<User>
  > {
    const ids = this.keys();
    for (const id of ids) {
      yield this.get.bind(this, id);
    }
  }

  public toJSON(): string[] {
    return [...this.data.keys()].sort();
  }
}

export class Role {
  public readonly id: string;
  public readonly enabled: boolean;
  public readonly name: string;
  public readonly assignments: AssignmentCollection;
  public readonly scopes: Set<string>;

  public constructor(data: {
    id: string;
    enabled: boolean;
    name: string;
    scopes: Iterable<string>;
    assignments: AssignmentCollection | Iterable<string>;
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

  public static read(tx: PoolClient, id: string): Promise<Role>;
  public static read(tx: PoolClient, id: string[]): Promise<Role[]>;
  public static async read(
    tx: PoolClient,
    id: string[] | string
  ): Promise<Role[] | Role> {
    const result = await tx.query(
      `
      SELECT
        entity_id AS id,
        enabled,
        name,
        scopes,
        json_agg(authx.role_record_assignment.user_id) AS assignments
      FROM authx.role_record
      LEFT JOIN authx.role_record_assignment
        ON authx.role_record_assignment.role_record_id = authx.role_record.record_id
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

    if (result.rows.length !== (typeof id === "string" ? 1 : id.length)) {
      throw new Error(
        "INVARIANT: Read must return the same number of records as requested."
      );
    }

    const roles = result.rows.map(row => new Role(row));

    return typeof id === "string" ? roles[0] : roles;
  }

  public static async write(
    tx: PoolClient,
    data: Role,
    metadata: { recordId: string; createdBySessionId: string; createdAt: Date }
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
        record_id,
        created_by_session_id,
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
        metadata.createdBySessionId,
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
      [metadata.recordId, data.assignments.keys()]
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
