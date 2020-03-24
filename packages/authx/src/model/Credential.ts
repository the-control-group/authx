import { Pool, ClientBase } from "pg";
import { Authority } from "./Authority";
import { User } from "./User";
import { Authorization } from "./Authorization";
import { NotFoundError } from "../errors";
import { CredentialAction, createV2AuthXScope } from "../util/scopes";
import { DataLoaderExecutor, DataLoaderCache } from "../loader";

export interface CredentialInvocationData {
  readonly id: string;
  readonly entityId: string;
  readonly recordId: null | string;
  readonly createdAt: Date;
}

export class CredentialInvocation implements CredentialInvocationData {
  public readonly id: string;
  public readonly entityId: string;
  public readonly recordId: null | string;
  public readonly createdAt: Date;

  constructor(data: CredentialInvocationData) {
    this.id = data.id;
    this.entityId = data.entityId;
    this.recordId = data.recordId;
    this.createdAt = data.createdAt;
  }
}

export interface CredentialRecordData {
  readonly id: string;
  readonly replacementRecordId: null | string;
  readonly entityId: string;
  readonly createdAt: Date;
  readonly createdByAuthorizationId: string;
}

export class CredentialRecord implements CredentialRecordData {
  public readonly id: string;
  public readonly replacementRecordId: null | string;
  public readonly entityId: string;
  public readonly createdAt: Date;
  public readonly createdByAuthorizationId: string;

  constructor(data: CredentialRecordData) {
    this.id = data.id;
    this.replacementRecordId = data.replacementRecordId;
    this.entityId = data.entityId;
    this.createdAt = data.createdAt;
    this.createdByAuthorizationId = data.createdByAuthorizationId;
  }
}

export interface CredentialData<C> {
  readonly id: string;
  readonly enabled: boolean;
  readonly authorityId: string;
  readonly authorityUserId: string;
  readonly userId: string;
  readonly details: C;
}

export type CredentialInstanceMap = {
  [key: string]: {
    new (data: CredentialData<any> & { readonly recordId: string }): Credential<
      any
    >;
  };
};

export abstract class Credential<C> implements CredentialData<C> {
  public readonly id: string;
  public readonly recordId: string;
  public readonly enabled: boolean;
  public readonly authorityId: string;
  public readonly authorityUserId: string;
  public readonly userId: string;
  public readonly details: C;

  private _user: null | Promise<User> = null;

  public constructor(data: CredentialData<C> & { readonly recordId: string }) {
    this.id = data.id;
    this.recordId = data.recordId;
    this.enabled = data.enabled;
    this.authorityId = data.authorityId;
    this.authorityUserId = data.authorityUserId;
    this.userId = data.userId;
    this.details = data.details;
  }

  public async isAccessibleBy(
    realm: string,
    a: Authorization,
    tx: Pool | ClientBase | DataLoaderExecutor,
    action: CredentialAction = {
      basic: "r",
      details: ""
    }
  ): Promise<boolean> {
    if (
      await a.can(
        tx,
        createV2AuthXScope(
          realm,
          {
            type: "credential",
            authorityId: this.authorityId,
            credentialId: this.id,
            userId: this.userId
          },
          action
        )
      )
    ) {
      return true;
    }

    return false;
  }

  public abstract authority(
    tx: Pool | ClientBase | DataLoaderExecutor,
    refresh?: boolean
  ): Promise<Authority<any>>;

  public user(
    tx: Pool | ClientBase | DataLoaderExecutor,
    refresh: boolean = false
  ): Promise<User> {
    if (!refresh && this._user) {
      return this._user;
    }

    return (this._user =
      // Some silliness to help typescript...
      tx instanceof DataLoaderExecutor
        ? User.read(tx, this.userId)
        : User.read(tx, this.userId));
  }

  public async records(tx: ClientBase): Promise<CredentialRecord[]> {
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
      row =>
        new CredentialRecord({
          ...row,
          replacementRecordId: row.replacement_record_id,
          createdByAuthorizationId: row.created_by_authorization_id,
          createdAt: row.created_at,
          entityId: row.entity_id
        })
    );
  }

  public async invoke(
    tx: Pool | ClientBase | DataLoaderExecutor,
    data: {
      id: string;
      createdAt: Date;
    }
  ): Promise<CredentialInvocation> {
    // insert the new invocation
    const result = await (tx instanceof DataLoaderExecutor
      ? tx.connection
      : tx
    ).query(
      `
      INSERT INTO authx.credential_invocation
      (
        invocation_id,
        entity_id,
        record_id,
        created_at
      )
      VALUES
        ($1, $2, $3, $4)
      RETURNING
        invocation_id AS id,
        entity_id,
        record_id,
        created_at
      `,
      [data.id, this.id, this.recordId, data.createdAt]
    );

    if (result.rows.length !== 1) {
      throw new Error("INVARIANT: Insert must return exactly one row.");
    }

    const row = result.rows[0];

    return new CredentialInvocation({
      id: row.id,
      entityId: row.entity_id,
      recordId: row.record_id,
      createdAt: row.created_at
    });
  }

  public async invocations(tx: ClientBase): Promise<CredentialInvocation[]> {
    const connection: Pool | ClientBase =
      tx instanceof DataLoaderExecutor ? tx.connection : tx;

    const result = await connection.query(
      `
      SELECT
        invocation_id as id,
        record_id,
        entity_id,
        created_at
      FROM authx.credential_invocation
      WHERE entity_id = $1
      ORDER BY created_at DESC
      `,
      [this.id]
    );

    return result.rows.map(
      row =>
        new CredentialInvocation({
          ...row,
          recordId: row.record_id,
          entityId: row.entity_id,
          createdAt: row.created_at
        })
    );
  }

  // Read from a concrete Credential sub-class with an executor.
  public static read<A, T extends Credential<A>>(
    this: new (data: CredentialData<any> & { readonly recordId: string }) => T,
    tx: DataLoaderExecutor,
    id: string,
    strategies?: undefined,
    options?: { forUpdate?: false }
  ): Promise<T>;

  public static read<A, T extends Credential<A>>(
    this: new (data: CredentialData<A> & { readonly recordId: string }) => T,
    tx: DataLoaderExecutor,
    id: readonly string[],
    strategies?: undefined,
    options?: { forUpdate?: false }
  ): Promise<T[]>;

  // Read from a concrete Credential sub-class.
  public static read<A, T extends Credential<A>>(
    this: new (data: CredentialData<any> & { readonly recordId: string }) => T,
    tx: Pool | ClientBase,
    id: string,
    strategies?: undefined,
    options?: { forUpdate?: boolean }
  ): Promise<T>;

  public static read<A, T extends Credential<A>>(
    this: new (data: CredentialData<A> & { readonly recordId: string }) => T,
    tx: Pool | ClientBase,
    id: readonly string[],
    strategies?: undefined,
    options?: { forUpdate?: boolean }
  ): Promise<T[]>;

  // Read from the Credential abstract class using an executor.
  public static read<M extends CredentialInstanceMap, K extends keyof M>(
    tx: DataLoaderExecutor,
    id: string,
    strategies?: undefined,
    options?: { forUpdate?: false }
  ): Promise<InstanceType<M[K]>>;

  public static read<M extends CredentialInstanceMap, K extends keyof M>(
    tx: DataLoaderExecutor,
    id: readonly string[],
    strategies?: undefined,
    options?: { forUpdate?: false }
  ): Promise<InstanceType<M[K]>[]>;

  // Read from the Credential abstract class using a connection and strategy map.
  public static read<M extends CredentialInstanceMap, K extends keyof M>(
    tx: Pool | ClientBase,
    id: string,
    strategies: { credentialMap: M },
    options?: { forUpdate?: boolean }
  ): Promise<InstanceType<M[K]>>;

  public static read<M extends CredentialInstanceMap, K extends keyof M>(
    tx: Pool | ClientBase,
    id: readonly string[],
    strategies: { credentialMap: M },
    options?: { forUpdate?: boolean }
  ): Promise<InstanceType<M[K]>[]>;

  public static async read<
    C,
    T extends Credential<C>,
    M extends CredentialInstanceMap,
    K extends keyof M
  >(
    this: {
      new (data: CredentialData<C> & { readonly recordId: string }): T;
    },
    tx: Pool | ClientBase | DataLoaderExecutor,
    id: readonly string[] | string,
    strategies?: { credentialMap: M },
    options?: { forUpdate?: boolean }
  ): Promise<InstanceType<M[K]>[] | InstanceType<M[K]> | T | T[]> {
    if (tx instanceof DataLoaderExecutor) {
      const loader = cache.get(tx);

      if (typeof id === "string") {
        const credential = await loader.load(id);
        // Address a scenario in which the loader could return a credential from
        // a sub-class.
        if (!(credential instanceof this)) {
          throw new NotFoundError();
        }

        return credential;
      }

      const credentials = await Promise.all(
        id.map(id => loader.load(id) as Promise<InstanceType<M[K]>>)
      );

      // Address a scenario in which the loader could return a credential from a
      // sub-class.
      return credentials.filter(credential => credential instanceof this);
    }

    const map = strategies?.credentialMap;

    if (typeof id !== "string" && !id.length) {
      return [];
    }

    const result = await tx.query(
      `
      SELECT
        authx.credential_record.entity_id AS id,
        authx.credential_record.record_id,
        authx.credential_record.enabled,
        authx.credential_record.authority_id,
        authx.credential_record.authority_user_id,
        authx.credential_record.user_id,
        authx.credential_record.details,
        authx.authority_record.strategy
      FROM authx.credential_record
      JOIN authx.authority_record
        ON authx.authority_record.entity_id = authx.credential_record.authority_id
        AND authx.authority_record.replacement_record_id IS NULL
      WHERE
        authx.credential_record.entity_id = ANY($1)
        AND authx.credential_record.replacement_record_id IS NULL
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

    const data = result.rows.map(row => {
      return {
        ...row,
        recordId: row.record_id,
        authorityId: row.authority_id,
        authorityUserId: row.authority_user_id,
        userId: row.user_id
      };
    });

    // No map is provided: instantiate all returned records with this class.
    if (!map) {
      const instances = data.map(data => new this(data));
      return typeof id === "string" ? instances[0] : instances;
    }

    // A map is provided: use the constructor for the corresponding strategy
    const instances = data.map(data => {
      const Class = map[data.strategy];

      if (!Class) {
        throw new Error(`The strategy "${data.strategy}" is not registered.`);
      }

      return new Class(data);
    });

    return typeof id === "string"
      ? (instances[0] as InstanceType<M[K]>)
      : (instances as InstanceType<M[K]>[]);
  }

  public static async write<C, T extends Credential<C>>(
    this: {
      new (data: CredentialData<C> & { readonly recordId: string }): T;
    },
    tx: Pool | ClientBase,
    data: CredentialData<C>,
    metadata: {
      recordId: string;
      createdByAuthorizationId: string;
      createdAt: Date;
    }
  ): Promise<T> {
    // ensure that the entity ID exists
    await tx.query(
      `
      INSERT INTO authx.credential
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
      UPDATE authx.credential_record
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
      INSERT INTO authx.credential_record
      (
        record_id,
        created_by_authorization_id,
        created_at,
        entity_id,
        enabled,
        authority_id,
        authority_user_id,
        user_id,
        details
      )
      VALUES
        ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING
        entity_id AS id,
        record_id,
        enabled,
        authority_id,
        authority_user_id,
        user_id,
        details
      `,
      [
        metadata.recordId,
        metadata.createdByAuthorizationId,
        metadata.createdAt,
        data.id,
        data.enabled,
        data.authorityId,
        data.authorityUserId,
        data.userId,
        data.details
      ]
    );

    if (next.rows.length !== 1) {
      throw new Error("INVARIANT: Insert must return exactly one row.");
    }

    const row = next.rows[0];
    return new this({
      ...row,
      recordId: row.record_id,
      authorityId: row.authority_id,
      authorityUserId: row.authority_user_id,
      userId: row.user_id
    }) as T;
  }

  public static clear(executor: DataLoaderExecutor, id: string): void {
    cache.get(executor).clear(id);
  }

  public static prime(
    executor: DataLoaderExecutor,
    id: string,
    value: Credential<any>
  ): void {
    cache.get(executor).prime(id, value);
  }
}

const cache = new DataLoaderCache(
  async (
    executor: DataLoaderExecutor,
    ids: readonly string[]
  ): Promise<Credential<any>[]> => {
    return Credential.read(executor.connection, ids, executor.strategies);
  }
);
