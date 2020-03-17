import { Pool, ClientBase } from "pg";
import { Credential, CredentialData } from "./Credential";
import { Grant } from "./Grant";
import { Role } from "./Role";
import { simplify, isSuperset } from "@authx/scopes";
import { Authorization } from "./Authorization";
import { NotFoundError } from "../errors";
import { UserAction, createV2AuthXScope } from "../util/scopes";
import { DataLoaderExecutor, DataLoaderCache } from "../loader";

export interface UserRecordData {
  readonly id: string;
  readonly replacementRecordId: null | string;
  readonly entityId: string;
  readonly createdAt: Date;
  readonly createdByAuthorizationId: string;
}

export class UserRecord implements UserRecordData {
  public readonly id: string;
  public readonly replacementRecordId: null | string;
  public readonly entityId: string;
  public readonly createdAt: Date;
  public readonly createdByAuthorizationId: string;

  constructor(data: UserRecordData) {
    this.id = data.id;
    this.replacementRecordId = data.replacementRecordId;
    this.entityId = data.entityId;
    this.createdAt = data.createdAt;
    this.createdByAuthorizationId = data.createdByAuthorizationId;
  }
}

export type UserType = "human" | "bot";

export interface UserData {
  readonly id: string;
  readonly enabled: boolean;
  readonly type: UserType;
  readonly name: string;
}

export class User implements UserData {
  public readonly id: string;
  public readonly recordId: string;
  public readonly enabled: boolean;
  public readonly type: UserType;
  public readonly name: string;

  private _authorizations: null | Promise<Authorization[]> = null;
  private _credentials: null | Promise<Credential<any>[]> = null;
  private _roles: null | Promise<Role[]> = null;
  private _grants: null | Promise<Grant[]> = null;

  public constructor(data: UserData & { readonly recordId: string }) {
    this.id = data.id;
    this.recordId = data.recordId;
    this.enabled = data.enabled;
    this.type = data.type;
    this.name = data.name;
  }

  public async isAccessibleBy(
    realm: string,
    a: Authorization,
    tx: Pool | ClientBase | DataLoaderExecutor,
    action: UserAction = {
      basic: "r"
    }
  ): Promise<boolean> {
    if (
      await a.can(
        tx,
        createV2AuthXScope(
          realm,
          {
            type: "user",
            userId: this.id
          },
          action
        )
      )
    ) {
      return true;
    }

    return false;
  }

  public async authorizations(
    tx: Pool | ClientBase | DataLoaderExecutor,
    refresh: boolean = false
  ): Promise<Authorization[]> {
    if (!refresh && this._authorizations) {
      return this._authorizations;
    }

    return (this._authorizations = (async () =>
      Authorization.read(
        tx,
        (
          await (tx instanceof DataLoaderExecutor ? tx.tx : tx).query(
            `
          SELECT entity_id AS id
          FROM authx.authorization_record
          WHERE
            user_id = $1
            AND replacement_record_id IS NULL
          `,
            [this.id]
          )
        ).rows.map(({ id }) => id)
      ))());
  }

  public async credentials(
    tx: Pool | ClientBase | DataLoaderExecutor,
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
        (
          await (tx instanceof DataLoaderExecutor ? tx.tx : tx).query(
            `
          SELECT entity_id AS id
          FROM authx.credential_record
          WHERE
            user_id = $1
            AND replacement_record_id IS NULL
          `,
            [this.id]
          )
        ).rows.map(({ id }) => id),
        map
      ))());
  }

  public async grants(
    tx: Pool | ClientBase | DataLoaderExecutor,
    refresh: boolean = false
  ): Promise<Grant[]> {
    if (!refresh && this._grants) {
      return this._grants;
    }

    return (this._grants = (async () =>
      Grant.read(
        tx,
        (
          await (tx instanceof DataLoaderExecutor ? tx.tx : tx).query(
            `
          SELECT entity_id AS id
          FROM authx.grant_record
          WHERE
            user_id = $1
            AND replacement_record_id IS NULL
          `,
            [this.id]
          )
        ).rows.map(({ id }) => id)
      ))());
  }

  public async grant(
    tx: Pool | ClientBase | DataLoaderExecutor,
    clientId: string
  ): Promise<null | Grant> {
    const result = await (tx instanceof DataLoaderExecutor ? tx.tx : tx).query(
      `
      SELECT entity_id AS id
      FROM authx.grant_record
      WHERE
        user_id = $1
        AND client_id = $2
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
    tx: Pool | ClientBase | DataLoaderExecutor,
    refresh: boolean = false
  ): Promise<Role[]> {
    if (!refresh && this._roles) {
      return this._roles;
    }

    return (this._roles = (async () =>
      Role.read(
        tx,
        (
          await (tx instanceof DataLoaderExecutor ? tx.tx : tx).query(
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
          )
        ).rows.map(({ id }) => id)
      ))());
  }

  public async access(
    tx: Pool | ClientBase | DataLoaderExecutor,
    values: {
      currentAuthorizationId: null | string;
      currentUserId: null | string;
      currentGrantId: null | string;
      currentClientId: null | string;
    },
    refresh: boolean = false
  ): Promise<string[]> {
    return this.enabled
      ? simplify(
          (await this.roles(tx, refresh))
            .map(role => role.access(values))
            .reduce((a, b) => a.concat(b), [])
        )
      : [];
  }

  public async can(
    tx: Pool | ClientBase | DataLoaderExecutor,
    values: {
      currentAuthorizationId: null | string;
      currentUserId: null | string;
      currentGrantId: null | string;
      currentClientId: null | string;
    },
    scope: string[] | string,
    refresh: boolean = false
  ): Promise<boolean> {
    return isSuperset(await this.access(tx, values, refresh), scope);
  }

  public async records(tx: ClientBase): Promise<UserRecord[]> {
    const result = await (tx instanceof DataLoaderExecutor ? tx.tx : tx).query(
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
        new UserRecord({
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
  ): Promise<User>;
  public static read(
    tx: Pool | ClientBase | DataLoaderExecutor,
    id: string[],
    options?: { forUpdate: boolean }
  ): Promise<User[]>;
  public static async read(
    tx: Pool | ClientBase | DataLoaderExecutor,
    id: string[] | string,
    options: { forUpdate: boolean } = { forUpdate: false }
  ): Promise<User[] | User> {
    if (tx instanceof DataLoaderExecutor) {
      if (options?.forUpdate) {
        // A loader cannot be used if forUpdate is true.
        tx = tx.tx;
      } else {
        // Otherwise, use the loader.
        const loader = this._cache.get(tx);
        return Promise.all(
          typeof id === "string"
            ? [loader.load(id)]
            : id.map(i => loader.load(i))
        );
      }
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
        type,
        name
      FROM authx.user_record
      WHERE
        entity_id = ANY($1)
        AND replacement_record_id IS NULL
      ${options.forUpdate ? "FOR UPDATE" : ""}
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
          recordId: row.record_id
        })
    );

    return typeof id === "string" ? users[0] : users;
  }

  public static async write(
    tx: Pool | ClientBase | DataLoaderExecutor,
    data: UserData,
    metadata: {
      recordId: string;
      createdByAuthorizationId: string;
      createdAt: Date;
    }
  ): Promise<User> {
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
        created_by_authorization_id,
        created_at,
        entity_id,
        enabled,
        type,
        name
      )
      VALUES
        ($1, $2, $3, $4, $5, $6, $7)
      RETURNING
        entity_id AS id,
        record_id,
        enabled,
        type,
        name
      `,
      [
        metadata.recordId,
        metadata.createdByAuthorizationId,
        metadata.createdAt,
        data.id,
        data.enabled,
        data.type,
        data.name
      ]
    );

    if (next.rows.length !== 1) {
      throw new Error("INVARIANT: Insert must return exactly one row.");
    }

    const row = next.rows[0];
    return new User({
      ...row,
      recordId: row.record_id
    });
  }

  private static readonly _cache = new DataLoaderCache<User, [], typeof User>(
    User
  );
}
