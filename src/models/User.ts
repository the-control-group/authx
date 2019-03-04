import { PoolClient } from "pg";
import { Role } from "./Role";

const CREDENTIALS = Symbol("credentials");
const GRANTS = Symbol("grants");
const ROLES = Symbol("roles");
const SCOPES = Symbol("scopes");

enum UserType {
  "human",
  "robot"
}

interface Plural {
  value: string;
  type?: string;
  primary?: boolean;
}

interface Profile {
  id: string;
  displayName: string;
  name?: {
    formatted?: string;
    familyName?: string;
    givenName?: string;
    middleName?: string;
    honorificPrefix?: string;
    honorificSuffix?: string;
  };
  nickname?: string;
  published?: string;
  updated?: string;
  birthday?: string;
  anniversary?: string;
  gender?: string;
  note?: string;
  preferredUsername?: string;
  utcOffset?: string;
  connected: boolean; // default: false
  emails: Plural[];
  urls: Plural[];
  phoneNumbers: Plural[];
  ims: Plural[];
  photos: Plural[];
  tags: Plural[];
  relationships: Plural[];
  addresses?: {
    formatted?: string;
    streetAddress?: string;
    locality?: string;
    region?: string;
    postalCode?: string;
    country?: string;
  }[];
  organizations?: {
    name?: string;
    department?: string;
    title?: string;
    type?: string;
    startDate?: string;
    endDate?: string;
    location?: string;
    description?: string;
  }[];
  accounts?: {
    domain?: string;
    username?: string;
    userid?: string;
  }[];
}

export class User {
  public id: string;
  public type: UserType;
  public profile: Profile;
  public recordId: null | string;

  private [CREDENTIALS]: null | Promise<Credential[]> = null;
  private [GRANTS]: null | Promise<Grant[]> = null;
  private [ROLES]: null | Promise<Role[]> = null;
  private [SCOPES]: null | Promise<Scope[]> = null;

  public constructor(data: {
    id: string;
    type: UserType;
    profile: Profile;
    recordId?: null | string;
  }) {
    this.id = data.id;
    this.type = data.type;
    this.profile = data.profile;
    this.recordId = data.recordId || null;
  }

  public async credentials(
    tx: PoolClient,
    refresh: boolean = false
  ): Promise<Credential[]> {
    // query the database for credentials
    if (!this[CREDENTIALS] || refresh)
      this[CREDENTIALS] = (async () =>
        Credential.read(
          tx,
          await tx.query(
            `
            SELECT entity_id AS id
            FROM authx.credential_records
            WHERE
              user_id = $1
              replacement_id IS NULL
            `,
            [this.id]
          )
        ))();

    return this[CREDENTIALS];
  }

  public async roles(
    tx: PoolClient,
    refresh: boolean = false
  ): Promise<Role[]> {
    // query the database for roles
    if (!this[ROLES] || refresh)
      return (this[ROLES] = (async () =>
        Role.read(
          tx,
          await tx.query(
            `
            SELECT entity_id AS id
            FROM authx.role_records
            WHERE user_id = $1
            `,
            [this.id]
          )
        ))());

    return this[ROLES];
  }

  public async grants(
    tx: PoolClient,
    refresh: boolean = false
  ): Promise<Grant[]> {
    // query the database for grants
    if (!this[GRANTS] || refresh)
      this[GRANTS] = (async () =>
        Grant.read(
          tx,
          await tx.query(
            `
            SELECT entity_id AS id
            FROM authx.grant_records
            WHERE user_id = $1
            `,
            [this.id]
          )
        ))();

    return this[GRANTS];
  }

  public async scopes(
    tx: PoolClient,
    refresh: boolean = false
  ): Promise<Scope[]> {
    if (!this[SCOPES] || refresh) {
      let roles = await this.roles(tx, refresh);
      let scopes = roles.map(role => role.scopes);

      this[SCOPES] = scopes.reduce((a, b) => a.concat(b), []);
    }

    return this[SCOPES];
  }

  public async can(scope: string, strict: boolean = true): Promise<boolean> {
    var roles = await this.roles();
    return roles.some(role => role.can(scope, strict));
  }

  public static async read(tx: PoolClient, id: string[]): Promise<User[]> {
    const result = await tx.query(
      `
      SELECT
        entity_id AS id,
        type,
        profile
      FROM authx.user_record
      WHERE entity_id = ANY($1) AND replacement_id IS NULL
      `,
      [id]
    );

    return result.rows.map(row => new User(row));
  }

  public static async write(
    tx: PoolClient,
    data: User,
    metadata: { recordId: string; createdByRoleId: string; createdAt: string }
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
      INSERT INTO authx.user_record
        (id, created_by_role_id, created_at, entity_id, type, profile)
      VALUES
        ($1, $2, $3, $4, $5)
      RETURNING
        entity_id AS id,
        type,
        profile
      `,
      [
        metadata.recordId,
        metadata.createdByRoleId,
        metadata.createdAt,
        data.id,
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
