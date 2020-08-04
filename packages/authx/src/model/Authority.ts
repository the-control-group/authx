import { Pool, ClientBase } from "pg";
import { Credential } from "./Credential";
import { Authorization } from "./Authorization";
import { NotFoundError } from "../errors";
import { AuthorityAction, createV2AuthXScope } from "../util/scopes";
import { DataLoaderExecutor, DataLoaderCache } from "../loader";

export interface AuthorityRecordData {
  readonly id: string;
  readonly replacementRecordId: null | string;
  readonly entityId: string;
  readonly createdAt: Date;
  readonly createdByAuthorizationId: string;
}

export class AuthorityRecord implements AuthorityRecordData {
  public readonly id: string;
  public readonly replacementRecordId: null | string;
  public readonly entityId: string;
  public readonly createdAt: Date;
  public readonly createdByAuthorizationId: string;

  constructor(data: AuthorityRecordData) {
    this.id = data.id;
    this.replacementRecordId = data.replacementRecordId;
    this.entityId = data.entityId;
    this.createdAt = data.createdAt;
    this.createdByAuthorizationId = data.createdByAuthorizationId;
  }
}

export interface AuthorityData<A> {
  readonly id: string;
  readonly enabled: boolean;
  readonly name: string;
  readonly description: string;
  readonly strategy: string;
  readonly details: A;
}

export type AuthorityInstanceMap = {
  [key: string]: {
    new (data: AuthorityData<any> & { readonly recordId: string }): Authority<
      any
    >;
  };
};

export abstract class Authority<A> implements AuthorityData<A> {
  public readonly id: string;
  public readonly recordId: string;
  public readonly enabled: boolean;
  public readonly name: string;
  public readonly description: string;
  public readonly strategy: string;
  public readonly details: A;

  public constructor(data: AuthorityData<A> & { readonly recordId: string }) {
    this.id = data.id;
    this.recordId = data.recordId;
    this.enabled = data.enabled;
    this.name = data.name;
    this.description = data.description;
    this.strategy = data.strategy;
    this.details = data.details;
  }

  public async isAccessibleBy(
    realm: string,
    a: Authorization,
    tx: Pool | ClientBase | DataLoaderExecutor,
    action: AuthorityAction = {
      basic: "r",
      details: "",
    }
  ): Promise<boolean> {
    if (
      await a.can(
        tx,
        createV2AuthXScope(
          realm,
          {
            type: "authority",
            authorityId: this.id,
          },
          action
        )
      )
    ) {
      return true;
    }

    return false;
  }

  public abstract credentials(
    tx: Pool | ClientBase | DataLoaderExecutor,
    refresh?: boolean
  ): Promise<Credential<any>[]>;

  public abstract credential(
    tx: Pool | ClientBase | DataLoaderExecutor,
    authorityUserId: string
  ): Promise<Credential<any> | null>;

  public async records(tx: ClientBase): Promise<AuthorityRecord[]> {
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
        created_at
      FROM authx.authorization_record
      WHERE entity_id = $1
      ORDER BY created_at DESC
      `,
      [this.id]
    );

    return result.rows.map(
      (row) =>
        new AuthorityRecord({
          ...row,
          replacementRecordId: row.replacement_record_id,
          createdByAuthorizationId: row.created_by_authorization_id,
          createdAt: row.created_at,
          entityId: row.entity_id,
        })
    );
  }

  // Read from a concrete Authority sub-class with an executor.
  public static read<C, T extends Authority<C>>(
    this: new (data: AuthorityData<any> & { readonly recordId: string }) => T,
    tx: DataLoaderExecutor,
    id: string,
    strategies?: undefined,
    options?: { forUpdate?: false }
  ): Promise<T>;

  public static read<C, T extends Authority<C>>(
    this: new (data: AuthorityData<C> & { readonly recordId: string }) => T,
    tx: DataLoaderExecutor,
    id: readonly string[],
    strategies?: undefined,
    options?: { forUpdate?: false }
  ): Promise<T[]>;

  // Read from a concrete Authority sub-class.
  public static read<C, T extends Authority<C>>(
    this: new (data: AuthorityData<any> & { readonly recordId: string }) => T,
    tx: Pool | ClientBase,
    id: string,
    strategies?: undefined,
    options?: { forUpdate?: boolean }
  ): Promise<T>;

  public static read<C, T extends Authority<C>>(
    this: new (data: AuthorityData<C> & { readonly recordId: string }) => T,
    tx: Pool | ClientBase,
    id: readonly string[],
    strategies?: undefined,
    options?: { forUpdate?: boolean }
  ): Promise<T[]>;

  // Read from the Authority abstract class using an executor.
  public static read<M extends AuthorityInstanceMap, K extends keyof M>(
    tx: DataLoaderExecutor,
    id: string,
    strategies?: undefined,
    options?: { forUpdate?: false }
  ): Promise<InstanceType<M[K]>>;

  public static read<M extends AuthorityInstanceMap, K extends keyof M>(
    tx: DataLoaderExecutor,
    id: readonly string[],
    strategies?: undefined,
    options?: { forUpdate?: false }
  ): Promise<InstanceType<M[K]>[]>;

  // Read from the Authority abstract class using a connection and strategy map.
  public static read<M extends AuthorityInstanceMap, K extends keyof M>(
    tx: Pool | ClientBase,
    id: string,
    strategies: { authorityMap: M },
    options?: { forUpdate?: boolean }
  ): Promise<InstanceType<M[K]>>;

  public static read<M extends AuthorityInstanceMap, K extends keyof M>(
    tx: Pool | ClientBase,
    id: readonly string[],
    strategies: { authorityMap: M },
    options?: { forUpdate?: boolean }
  ): Promise<InstanceType<M[K]>[]>;

  public static async read<
    A,
    T extends Authority<A>,
    M extends AuthorityInstanceMap,
    K extends keyof M
  >(
    this: {
      new (data: AuthorityData<A> & { readonly recordId: string }): T;
    },
    tx: Pool | ClientBase | DataLoaderExecutor,
    id: readonly string[] | string,
    strategies?: { authorityMap: M },
    options?: { forUpdate?: boolean }
  ): Promise<InstanceType<M[K]>[] | InstanceType<M[K]> | T | T[]> {
    if (tx instanceof DataLoaderExecutor) {
      const loader = cache.get(tx);

      if (typeof id === "string") {
        const authority = await loader.load(id);
        // Address a scenario in which the loader could return a authority from
        // a sub-class.
        if (!(authority instanceof this)) {
          throw new NotFoundError();
        }

        return authority;
      }

      const authoritys = await Promise.all(
        id.map((id) => loader.load(id) as Promise<InstanceType<M[K]>>)
      );

      // Address a scenario in which the loader could return a authority from a
      // sub-class.
      return authoritys.filter((authority) => authority instanceof this);
    }

    const map = strategies?.authorityMap;

    if (typeof id !== "string" && !id.length) {
      return [];
    }

    const result = await tx.query(
      `
      SELECT
        entity_id AS id,
        record_id,
        enabled,
        name,
        description,
        strategy,
        details
      FROM authx.authority_record
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

    const data = result.rows.map((row) => {
      return {
        ...row,
        recordId: row.record_id,
        baseUrls: row.base_urls,
      };
    });

    // No map is provided: instantiate all returned records with this class
    if (!map) {
      const instances = data.map((data) => new this(data));
      return typeof id === "string" ? instances[0] : instances;
    }

    // A map is provided: use the constructor for the corresponding strategy
    const instances = data.map((data) => {
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

  public static async write<A, T extends Authority<A>>(
    this: {
      new (data: AuthorityData<A> & { readonly recordId: string }): T;
    },
    tx: Pool | ClientBase,
    data: AuthorityData<A>,
    metadata: {
      recordId: string;
      createdByAuthorizationId: string;
      createdAt: Date;
    }
  ): Promise<T> {
    // ensure that the entity ID exists
    await tx.query(
      `
      INSERT INTO authx.authority
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
      UPDATE authx.authority_record
      SET replacement_record_id = $2
      WHERE
        entity_id = $1
        AND replacement_record_id IS NULL
      RETURNING
        entity_id AS id,
        strategy
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
      INSERT INTO authx.authority_record
      (
        record_id,
        created_by_authorization_id,
        created_at,
        entity_id,
        enabled,
        name,
        description,
        strategy,
        details
      )
      VALUES
        ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING
        entity_id AS id,
        record_id,
        enabled,
        name,
        description,
        strategy,
        details
      `,
      [
        metadata.recordId,
        metadata.createdByAuthorizationId,
        metadata.createdAt,
        data.id,
        data.enabled,
        data.name,
        data.description,
        data.strategy,
        data.details,
      ]
    );

    if (next.rows.length !== 1) {
      throw new Error("INVARIANT: Insert must return exactly one row.");
    }

    const row = next.rows[0];
    return new this({
      ...row,
      recordId: row.record_id,
      baseUrls: row.base_urls,
    }) as T;
  }

  public static clear(executor: DataLoaderExecutor, id: string): void {
    cache.get(executor).clear(id);
  }

  public static prime(
    executor: DataLoaderExecutor,
    id: string,
    value: Authority<any>
  ): void {
    cache.get(executor).prime(id, value);
  }
}

const cache = new DataLoaderCache(
  async (
    executor: DataLoaderExecutor,
    ids: readonly string[]
  ): Promise<Authority<any>[]> => {
    return Authority.read(executor.connection, ids, executor.strategies);
  }
);
