import { PoolClient } from "pg";
import { Credential, CredentialData } from "./Credential";
import { Grant } from "./Grant";
import { Role } from "./Role";
import { ProfileName } from "./Profile";
import { simplify, isSuperset } from "scopeutils";
import { Token } from "./Token";
import { NotFoundError } from "../errors";

export type UserType = "human" | "bot";

export interface UserData {
  readonly id: string;
  readonly enabled: boolean;
  readonly type: UserType;

  // Fields described by the Portable Contact spec:
  // http://portablecontacts.net/draft-spec.html
  readonly displayName: string;
  readonly name: null | {
    formatted: null | string;
    familyName: null | string;
    givenName: null | string;
    middleName: null | string;
    honorificPrefix: null | string;
    honorificSuffix: null | string;
  };
  readonly nickname: null | string;
  readonly birthday: null | string;
  readonly anniversary: null | string;
  readonly gender: null | string;
  readonly note: null | string;
  readonly preferredUsername: null | string;
  readonly utcOffset: null | string;
}

export class User implements UserData {
  public readonly id: string;
  public readonly enabled: boolean;
  public readonly type: UserType;

  // Fields described by the Portable Contact spec:
  // http://portablecontacts.net/draft-spec.html
  public readonly displayName: string;
  public readonly name: null | {
    formatted: null | string;
    familyName: null | string;
    givenName: null | string;
    middleName: null | string;
    honorificPrefix: null | string;
    honorificSuffix: null | string;
  };
  public readonly nickname: null | string;
  public readonly birthday: null | string;
  public readonly anniversary: null | string;
  public readonly gender: null | string;
  public readonly note: null | string;
  public readonly preferredUsername: null | string;
  public readonly utcOffset: null | string;

  private _credentials: null | Promise<Credential<any>[]> = null;
  private _roles: null | Promise<Role[]> = null;
  private _grants: null | Promise<Grant[]> = null;

  public constructor(data: UserData) {
    this.id = data.id;
    this.enabled = data.enabled;
    this.type = data.type;

    // Fields described by the Portable Contact spec:
    // http://portablecontacts.net/draft-spec.html
    this.name = data.name;
    this.displayName = data.displayName;
    this.nickname = data.nickname;
    this.birthday = data.birthday;
    this.anniversary = data.anniversary;
    this.gender = data.gender;
    this.note = data.note;
    this.preferredUsername = data.preferredUsername;
    this.utcOffset = data.utcOffset;
  }

  public async visible(
    realm: string,
    tx: PoolClient,
    token: Token
  ): Promise<boolean> {
    // all users are visible
    if (await token.can(tx, `${realm}:user:read`)) {
      return true;
    }

    // this user is visible
    if (
      (await token.can(tx, `${realm}:user.self:read`)) &&
      (await token.user(tx)).id === this.id
    ) {
      return true;
    }

    return false;
  }

  public async credentials(
    tx: PoolClient,
    map: {
      [key: string]: { new (data: CredentialData<any>): Credential<any> };
    },
    refresh: boolean = false
  ): Promise<Credential<any>[]> {
    if (!refresh && this._credentials) {
      return this._credentials;
    }

    return (this._credentials = (async () =>
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
        )).rows.map(({ id }) => id),
        map
      ))());
  }

  public async roles(
    tx: PoolClient,
    refresh: boolean = false
  ): Promise<Role[]> {
    if (!refresh && this._roles) {
      return this._roles;
    }

    return (this._roles = (async () =>
      Role.read(
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
      ))());
  }

  public async grants(
    tx: PoolClient,
    refresh: boolean = false
  ): Promise<Grant[]> {
    if (!refresh && this._grants) {
      return this._grants;
    }

    return (this._grants = (async () =>
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

  public async access(
    tx: PoolClient,
    refresh: boolean = false
  ): Promise<string[]> {
    return simplify(
      (await this.roles(tx, refresh))
        .map(role => role.scopes)
        .reduce((a, b) => a.concat(b), [])
    );
  }

  public async can(
    tx: PoolClient,
    scope: string[] | string,
    refresh: boolean = false
  ): Promise<boolean> {
    return isSuperset(await this.access(tx, refresh), scope);
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
        display_name,
        name,
        nickname,
        birthday,
        anniversary,
        gender,
        note,
        preferred_username,
        utc_offset
      FROM authx.user_record
      WHERE
        entity_id = ANY($1)
        AND replacement_record_id IS NULL
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

    const users = result.rows.map(
      row =>
        new User({
          ...row,
          displayName: row.display_name,
          preferredUsername: row.preferred_username,
          utcOffset: row.utc_offset
        })
    );

    return typeof id === "string" ? users[0] : users;
  }

  public static async write(
    tx: PoolClient,
    data: UserData,
    metadata: { recordId: string; createdByTokenId: string; createdAt: Date }
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

    if (previous.rows.length > 1) {
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
        created_by_token_id,
        created_at,
        entity_id,
        enabled,
        type,
        display_name,
        name,
        nickname,
        birthday,
        anniversary,
        gender,
        note,
        preferred_username,
        utc_offset
      )
      VALUES
        ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING
        entity_id AS id,
        enabled,
        type,
        display_name,
        name,
        nickname,
        birthday,
        anniversary,
        gender,
        note,
        preferred_username,
        utc_offset
      `,
      [
        metadata.recordId,
        metadata.createdByTokenId,
        metadata.createdAt,
        data.id,
        data.enabled,
        data.type,
        data.displayName,
        data.name,
        data.nickname,
        data.birthday,
        data.anniversary,
        data.gender,
        data.note,
        data.preferredUsername,
        data.utcOffset
      ]
    );

    if (next.rows.length !== 1) {
      throw new Error("INVARIANT: Insert must return exactly one row.");
    }

    return new User({
      ...next.rows[0],
      displayName: next.rows[0].display_name,
      preferredUsername: next.rows[0].preferred_username,
      utcOffset: next.rows[0].utc_offset
    });
  }
}
