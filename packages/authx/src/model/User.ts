import { PoolClient } from "pg";
import { Credential, CredentialData } from "./Credential";
import { Grant } from "./Grant";
import { Role } from "./Role";
import { Client } from "./Client";
import { ContactInitialInput } from "./ContactInput";
import { simplify, isSuperset, isStrictSuperset } from "scopeutils";
import { Token } from "./Token";
import { NotFoundError } from "../errors";

export type UserType = "human" | "bot";

export interface UserData {
  readonly id: string;
  readonly enabled: boolean;
  readonly type: UserType;
  readonly contact: ContactInitialInput;
}

export class User implements UserData {
  public readonly id: string;
  public readonly enabled: boolean;
  public readonly type: UserType;
  public readonly contact: ContactInitialInput;

  private _credentials: null | Promise<Credential<any>[]> = null;
  private _roles: null | Promise<Role[]> = null;
  private _grants: null | Promise<Grant[]> = null;
  private _clients: null | Promise<Client[]> = null;

  public constructor(data: UserData) {
    this.id = data.id;
    this.enabled = data.enabled;
    this.type = data.type;
    this.contact = data.contact;
  }

  public async isAccessibleBy(
    realm: string,
    t: Token,
    tx: PoolClient,
    action: string = "read.basic"
  ): Promise<boolean> {
    // can access all users
    if (await t.can(tx, `${realm}:user.*.*:${action}`)) {
      return true;
    }

    // can access self
    if (
      this.id === t.userId &&
      (await t.can(tx, `${realm}:user.equal.self:${action}`))
    ) {
      return true;
    }

    // can access the users of users with lesser or equal access
    if (await t.can(tx, `${realm}:user.equal.*:${action}`)) {
      return isSuperset(
        await (await t.user(tx)).access(tx),
        await this.access(tx)
      );
    }

    // can access the users of users with lesser access
    if (await t.can(tx, `${realm}:user.equal.lesser:${action}`)) {
      return isStrictSuperset(
        await (await t.user(tx)).access(tx),
        await this.access(tx)
      );
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
            AND enabled = TRUE
            AND replacement_record_id IS NULL
          `,
          [this.id]
        )).rows.map(({ id }) => id),
        map
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
          FROM authx.grant_record
          WHERE
            user_id = $1
            AND enabled = TRUE
            AND replacement_record_id IS NULL
          `,
          [this.id]
        )).rows.map(({ id }) => id)
      ))());
  }

  public async grant(
    tx: PoolClient,
    clientId: string,
    refresh: boolean = false
  ): Promise<null | Grant> {
    const result = await tx.query(
      `
      SELECT entity_id AS id
      FROM authx.grant_record
      WHERE
        user_id = $1
        AND client_id = $2
        AND enabled = TRUE
        AND replacement_record_id IS NULL
      `,
      [this.id, clientId]
    );

    if (result.rows.length > 1) {
      throw new Error(
        "INVARIANT: It must be impossible for the same user and client to have multiple enabled grants.."
      );
    }

    if (result.rows.length) {
      return Grant.read(tx, result.rows[0].id);
    }

    return null;
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
          AND authx.role_record.enabled = TRUE
          AND authx.role_record.replacement_record_id IS NULL
        `,
          [this.id]
        )).rows.map(({ id }) => id)
      ))());
  }

  public async clients(
    tx: PoolClient,
    refresh: boolean = false
  ): Promise<Client[]> {
    if (!refresh && this._clients) {
      return this._clients;
    }

    return (this._clients = (async () =>
      Client.read(
        tx,
        (await tx.query(
          `
        SELECT entity_id AS id
        FROM authx.client_record
        JOIN authx.client_record_user
          ON authx.client_record_user.client_record_id = authx.client_record.record_id
        WHERE
          authx.client_record_user.user_id = $1
          AND authx.client_record.enabled = TRUE
          AND authx.client_record.replacement_record_id IS NULL
        `,
          [this.id]
        )).rows.map(({ id }) => id)
      ))());
  }

  public async access(
    tx: PoolClient,
    refresh: boolean = false
  ): Promise<string[]> {
    return this.enabled
      ? simplify(
          (await this.roles(tx, refresh))
            .map(role => role.scopes)
            .reduce((a, b) => a.concat(b), [])
        )
      : [];
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
        contact
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
          ...row
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
        contact
      )
      VALUES
        ($1, $2, $3, $4, $5, $6, $7)
      RETURNING
        entity_id AS id,
        enabled,
        type,
        contact
      `,
      [
        metadata.recordId,
        metadata.createdByTokenId,
        metadata.createdAt,
        data.id,
        data.enabled,
        data.type,
        data.contact
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
