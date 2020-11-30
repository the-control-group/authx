import { Pool, ClientBase } from "pg";
import { Credential, CredentialData } from "./Credential";
import { Grant } from "./Grant";
import { Role } from "./Role";
import { simplify, isSuperset } from "@authx/scopes";
import { Authorization } from "./Authorization";
import { NotFoundError } from "../errors";
import { UserAction, createV2AuthXScope } from "../util/scopes";
import { DataLoaderExecutor, DataLoaderCache, QueryCache } from "../loader";

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
      basic: "r",
      scopes: "",
    }
  ): Promise<boolean> {
    if (
      await a.can(
        tx,
        realm,
        createV2AuthXScope(
          realm,
          {
            type: "user",
            userId: this.id,
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
    tx: Pool | ClientBase | DataLoaderExecutor
  ): Promise<Authorization[]> {
    return (async () => {
      const ids: readonly string[] = (
        await queryCache.query(
          tx,
          `
          SELECT entity_id AS id
          FROM authx.authorization_record
          WHERE
            user_id = $1
            AND replacement_record_id IS NULL
          `,
          [this.id]
        )
      ).rows.map(({ id }) => id);

      // Some silliness to help typescript...
      return tx instanceof DataLoaderExecutor
        ? Authorization.read(tx, ids)
        : Authorization.read(tx, ids);
    })();
  }

  public async credentials(
    tx: DataLoaderExecutor,
    strategies?: undefined
  ): Promise<Credential<unknown>[]>;

  public async credentials(
    tx: Pool | ClientBase,
    strategies: {
      credentialMap: {
        [key: string]: { new (data: CredentialData<any>): Credential<any> };
      };
    }
  ): Promise<Credential<unknown>[]>;

  public async credentials(
    tx: Pool | ClientBase | DataLoaderExecutor,
    strategies?: {
      credentialMap: {
        [key: string]: { new (data: CredentialData<any>): Credential<any> };
      };
    }
  ): Promise<Credential<unknown>[]> {
    const ids: readonly string[] = (
      await queryCache.query(
        tx,
        `
          SELECT entity_id AS id
          FROM authx.credential_record
          WHERE
            user_id = $1
            AND replacement_record_id IS NULL
          ORDER BY id ASC
          `,
        [this.id]
      )
    ).rows.map(({ id }) => id);

    return tx instanceof DataLoaderExecutor
      ? Credential.read(tx, ids)
      : Credential.read(
          tx,
          ids,
          strategies as typeof strategies & { [key: string]: unknown }
        );
  }

  public async grants(
    tx: Pool | ClientBase | DataLoaderExecutor
  ): Promise<Grant[]> {
    const ids = (
      await queryCache.query(
        tx,
        `
          SELECT entity_id AS id
          FROM authx.grant_record
          WHERE
            user_id = $1
            AND replacement_record_id IS NULL
          ORDER BY id ASC
          `,
        [this.id]
      )
    ).rows.map(({ id }) => id);

    // Some silliness to help typescript...
    return tx instanceof DataLoaderExecutor
      ? Grant.read(tx, ids)
      : Grant.read(tx, ids);
  }

  public async grant(
    tx: Pool | ClientBase | DataLoaderExecutor,
    clientId: string
  ): Promise<null | Grant> {
    const result = await queryCache.query(
      tx,
      `
      SELECT entity_id AS id
      FROM authx.grant_record
      WHERE
        user_id = $1
        AND client_id = $2
        AND replacement_record_id IS NULL
        AND enabled = TRUE
      ORDER BY id ASC
      `,
      [this.id, clientId]
    );

    if (result.rows.length > 1) {
      throw new Error(
        "INVARIANT: It must be impossible for the same user and client to have multiple enabled grants.."
      );
    }

    if (result.rows.length) {
      return tx instanceof DataLoaderExecutor
        ? Grant.read(tx, result.rows[0].id)
        : Grant.read(tx, result.rows[0].id);
    }

    return null;
  }

  public async roles(
    tx: Pool | ClientBase | DataLoaderExecutor
  ): Promise<Role[]> {
    return (async () => {
      const ids = (
        await queryCache.query(
          tx,
          `
        SELECT entity_id AS id
        FROM authx.role_record
        JOIN authx.role_record_user
          ON authx.role_record_user.role_record_id = authx.role_record.record_id
        WHERE
          authx.role_record_user.user_id = $1
          AND authx.role_record.enabled = TRUE
          AND authx.role_record.replacement_record_id IS NULL
        ORDER BY id ASC
        `,
          [this.id]
        )
      ).rows.map(({ id }) => id);

      // Some silliness to help typescript...
      return tx instanceof DataLoaderExecutor
        ? Role.read(tx, ids)
        : Role.read(tx, ids);
    })();
  }

  public async access(
    tx: Pool | ClientBase | DataLoaderExecutor,
    values: {
      currentAuthorizationId: null | string;
      currentUserId: null | string;
      currentGrantId: null | string;
      currentClientId: null | string;
    }
  ): Promise<string[]> {
    return this.enabled
      ? simplify(
          (await this.roles(tx))
            .map((role) => role.access(values))
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
    scope: string[] | string
  ): Promise<boolean> {
    return isSuperset(await this.access(tx, values), scope);
  }

  public async records(tx: ClientBase): Promise<UserRecord[]> {
    const connection: Pool | ClientBase =
      tx instanceof DataLoaderExecutor ? tx.connection : tx;

    const result = await connection.query(
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
        new UserRecord({
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
  ): Promise<User>;

  public static read(
    tx: DataLoaderExecutor,
    id: readonly string[],
    options?: { forUpdate?: false }
  ): Promise<User[]>;

  // Read using a connection.
  public static read(
    tx: Pool | ClientBase,
    id: string,
    options?: { forUpdate?: boolean }
  ): Promise<User>;

  public static read(
    tx: Pool | ClientBase,
    id: readonly string[],
    options?: { forUpdate?: boolean }
  ): Promise<User[]>;

  public static async read(
    tx: Pool | ClientBase | DataLoaderExecutor,
    id: readonly string[] | string,
    options?: { forUpdate?: boolean }
  ): Promise<User[] | User> {
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
      ${options?.forUpdate ? "FOR UPDATE" : ""}
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
      (row) =>
        new User({
          ...row,
          recordId: row.record_id,
        })
    );

    return typeof id === "string" ? users[0] : users;
  }

  public static async write(
    tx: Pool | ClientBase,
    data: UserData,
    metadata: {
      recordId: string;
      createdByAuthorizationId: string;
      createdAt: Date;
    }
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
        data.name,
      ]
    );

    if (next.rows.length !== 1) {
      throw new Error("INVARIANT: Insert must return exactly one row.");
    }

    const row = next.rows[0];
    return new User({
      ...row,
      recordId: row.record_id,
    });
  }

  public static clear(executor: DataLoaderExecutor, id: string): void {
    cache.get(executor).clear(id);
  }

  public static prime(
    executor: DataLoaderExecutor,
    id: string,
    value: User
  ): void {
    cache.get(executor).prime(id, value);
  }
}

const cache = new DataLoaderCache(
  async (
    executor: DataLoaderExecutor,
    ids: readonly string[]
  ): Promise<User[]> => {
    return User.read(executor.connection, ids);
  }
);

const queryCache = new QueryCache<{ id: string }>();
