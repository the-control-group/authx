import { ClientBase } from "pg";
import { Credential } from "./Credential";
import { Authorization } from "./Authorization";
import { NotFoundError } from "../errors";
import { AuthorityAction, createV2AuthXScope } from "../util/scopes";

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
    tx: ClientBase,
    action: AuthorityAction = {
      basic: "r",
      details: ""
    }
  ): Promise<boolean> {
    const values = {
      currentAuthorizationId: a.id,
      currentUserId: a.userId,
      currentGrantId: a.grantId ?? null,
      currentClientId: (await a.grant(tx))?.clientId ?? null
    };

    if (
      await a.can(
        tx,
        values,
        createV2AuthXScope(
          realm,
          {
            type: "authority",
            authorityId: this.id
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
    tx: ClientBase,
    refresh?: boolean
  ): Promise<Credential<any>[]>;

  public abstract credential(
    tx: ClientBase,
    authorityUserId: string
  ): Promise<Credential<any> | null>;

  public async records(tx: ClientBase): Promise<AuthorityRecord[]> {
    const result = await tx.query(
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
      row =>
        new AuthorityRecord({
          ...row,
          replacementRecordId: row.replacement_record_id,
          createdByAuthorizationId: row.created_by_authorization_id,
          createdAt: row.created_at,
          entityId: row.entity_id
        })
    );
  }

  public static read<T extends Authority<any>>(
    this: new (data: AuthorityData<any> & { readonly recordId: string }) => T,
    tx: ClientBase,
    id: string,
    options?: { forUpdate: boolean }
  ): Promise<T>;

  public static read<T extends Authority<any>>(
    this: new (data: AuthorityData<any> & { readonly recordId: string }) => T,
    tx: ClientBase,
    id: string[],
    options?: { forUpdate: boolean }
  ): Promise<T[]>;

  public static read<
    M extends {
      [key: string]: {
        new (
          data: AuthorityData<any> & { readonly recordId: string }
        ): Authority<any>;
      };
    },
    K extends keyof M
  >(
    tx: ClientBase,
    id: string,
    map: M,
    options?: { forUpdate: boolean }
  ): Promise<InstanceType<M[K]>>;

  public static read<
    M extends {
      [key: string]: {
        new (
          data: AuthorityData<any> & { readonly recordId: string }
        ): Authority<any>;
      };
    },
    K extends keyof M
  >(
    tx: ClientBase,
    id: string[],
    map: M,
    options?: { forUpdate: boolean }
  ): Promise<InstanceType<M[K]>[]>;

  public static async read<
    T,
    M extends {
      [key: string]: any;
    },
    K extends keyof M
  >(
    this: {
      new (data: AuthorityData<any> & { readonly recordId: string }): T;
    },
    tx: ClientBase,
    id: string[] | string,
    map?: M,
    options: { forUpdate: boolean } = { forUpdate: false }
  ): Promise<InstanceType<M[K]>[] | InstanceType<M[K]> | T | T[]> {
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

    const data = result.rows.map(row => {
      return {
        ...row,
        recordId: row.record_id,
        baseUrls: row.base_urls
      };
    });

    // No map is provided: instantiate all returned records with this class
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

    return typeof id === "string" ? instances[0] : instances;
  }

  public static async write<T extends Authority<any>>(
    this: {
      new (data: AuthorityData<any> & { readonly recordId: string }): T;
    },
    tx: ClientBase,
    data: AuthorityData<any>,
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
      baseUrls: row.base_urls
    });
  }
}
