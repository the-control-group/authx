import { PoolClient } from "pg";
import { Credential, CredentialData } from "./Credential";
import { Grant } from "./Grant";
import { Role } from "./Role";
import { Profile } from "../util/Profile";

export type UserType = "human" | "bot";

export interface UserData {
  readonly id: string;
  readonly enabled: boolean;
  readonly type: UserType;
  readonly profile: Profile;
}

export class User implements UserData {
  public readonly id: string;
  public readonly enabled: boolean;
  public readonly type: UserType;
  public readonly profile: Profile;

  public constructor(data: UserData) {
    this.id = data.id;
    this.enabled = data.enabled;
    this.type = data.type;
    this.profile = data.profile;
  }

  public async credentials(
    tx: PoolClient,
    map: {
      [key: string]: { new (data: CredentialData<any>): Credential<any> };
    }
  ): Promise<Credential<any>[]> {
    return Credential.read(
      tx,
      (await tx.query(
        `
          SELECT entity_id AS id
          FROM authx.credential_record
          WHERE
            user_id = $1
            AND replacement_record_id IS NULL
          `,
        [this.id]
      )).rows.map(({ id }) => id),
      map
    );
  }

  public async roles(tx: PoolClient): Promise<Role[]> {
    return Role.read(
      tx,
      (await tx.query(
        `
        SELECT entity_id AS id
        FROM authx.role_record
        JOIN authx.role_record_user
          ON authx.role_record_user.role_record_id = authx.role_record.record_id
        WHERE
          authx.role_record_user.user_id = $1
          AND authx.role_record.replacement_record_id IS NULL
        `,
        [this.id]
      )).rows.map(({ id }) => id)
    );
  }

  public async grants(tx: PoolClient): Promise<Grant[]> {
    return Grant.read(
      tx,
      (await tx.query(
        `
          SELECT entity_id AS id
          FROM authx.grant_records
          WHERE
            user_id = $1
            AND replacement_record_id IS NULL
          `,
        [this.id]
      )).rows.map(({ id }) => id)
    );
  }

  public async scopes(tx: PoolClient): Promise<Set<string>> {
    return (await this.roles(tx))
      .map(role => role.scopes)
      .reduce((a, b) => {
        for (const s of b) {
          a.add(s);
        }

        return a;
      }, new Set());
  }

  public async can(
    tx: PoolClient,
    scope: string,
    strict: boolean = true
  ): Promise<boolean> {
    var roles = await this.roles(tx);
    return roles.some(role => role.can(scope, strict));
  }

  public static read(tx: PoolClient, id: string): Promise<User>;
  public static read(tx: PoolClient, id: string[]): Promise<User[]>;
  public static async read(
    tx: PoolClient,
    id: string[] | string
  ): Promise<User[] | User> {
    if (typeof id !== "string" && !id.length) {
      return [];
    }

    const result = await tx.query(
      `
      SELECT
        entity_id AS id,
        enabled,
        type,
        profile
      FROM authx.user_record
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

    const users = result.rows.map(row => new User(row));

    return typeof id === "string" ? users[0] : users;
  }

  public static async write(
    tx: PoolClient,
    data: UserData,
    metadata: { recordId: string; createdBySessionId: string; createdAt: Date }
  ): Promise<User> {
    // ensure that the entity ID exists
    await tx.query(
      `
      INSERT INTO authx.user
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
      UPDATE authx.user_record
      SET replacement_record_id = $2
      WHERE
        entity_id = $1
        AND replacement_record_id IS NULL
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
      INSERT INTO authx.user_record
      (
        record_id,
        created_by_session_id,
        created_at,
        entity_id,
        enabled,
        type,
        profile
      )
      VALUES
        ($1, $2, $3, $4, $5, $6, $7)
      RETURNING
        entity_id AS id,
        enabled,
        type,
        profile
      `,
      [
        metadata.recordId,
        metadata.createdBySessionId,
        metadata.createdAt,
        data.id,
        data.enabled,
        data.type,
        data.profile
      ]
    );

    if (next.rows.length !== 1) {
      throw new Error("INVARIANT: Insert must return exactly one row.");
    }

    return new User(next.rows[0]);
  }
}
