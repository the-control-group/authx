import { PoolClient } from "pg";
import { Credential } from "./Credential";
import { Grant } from "./Grant";
import { Role } from "./Role";
import { Profile } from "../util/Profile";

const CREDENTIALS = Symbol("credentials");
const GRANTS = Symbol("grants");
const ROLES = Symbol("roles");
const SCOPES = Symbol("scopes");

type UserType = "human" | "bot";

export class User {
  public readonly id: string;
  public readonly enabled: boolean;
  public readonly type: UserType;
  public readonly profile: Profile;

  private [CREDENTIALS]: null | Promise<Credential[]> = null;
  private [GRANTS]: null | Promise<Grant[]> = null;
  private [ROLES]: null | Promise<Role[]> = null;
  private [SCOPES]: null | Promise<Set<string>> = null;

  public constructor(data: {
    id: string;
    enabled: boolean;
    type: UserType;
    profile: Profile;
  }) {
    this.id = data.id;
    this.enabled = data.enabled;
    this.type = data.type;
    this.profile = data.profile;
  }

  public async credentials(
    tx: PoolClient,
    refresh: boolean = false
  ): Promise<Credential[]> {
    const credentials = this[CREDENTIALS];
    if (credentials && !refresh) {
      return credentials;
    }

    return (this[CREDENTIALS] = (async () =>
      Credential.read(
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
        )).rows.map(({ id }) => id)
      ))());
  }

  public async roles(
    tx: PoolClient,
    refresh: boolean = false
  ): Promise<Role[]> {
    const roles = this[ROLES];
    if (roles && !refresh) {
      return roles;
    }

    // query the database for roles
    return (this[ROLES] = (async () => {
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
    })());
  }

  public async grants(
    tx: PoolClient,
    refresh: boolean = false
  ): Promise<Grant[]> {
    const grants = this[GRANTS];
    if (grants && !refresh) {
      return grants;
    }

    // query the database for grants
    return (this[GRANTS] = (async () =>
      Grant.read(
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
      ))());
  }

  public async scopes(
    tx: PoolClient,
    refresh: boolean = false
  ): Promise<Set<string>> {
    const scopes = this[SCOPES];
    if (scopes && !refresh) {
      return scopes;
    }

    return (this[SCOPES] = (async () =>
      (await this.roles(tx, refresh))
        .map(role => role.scopes)
        .reduce((a, b) => {
          for (const s of b) {
            a.add(s);
          }

          return a;
        }, new Set()))());
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
    data: User,
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
