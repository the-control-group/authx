import { PoolClient } from "pg";
import { Authority } from "./Authority";
import { User } from "./User";
import { Authorization } from "./Authorization";
import { NotFoundError } from "../errors";

export interface CredentialData<C> {
  readonly id: string;
  readonly enabled: boolean;
  readonly authorityId: string;
  readonly authorityUserId: string;
  readonly userId: string;
  readonly details: C;
}

export abstract class Credential<C> implements CredentialData<C> {
  public readonly id: string;
  public readonly enabled: boolean;
  public readonly authorityId: string;
  public readonly authorityUserId: string;
  public readonly userId: string;
  public readonly details: C;

  private _user: null | Promise<User> = null;

  public constructor(data: CredentialData<C>) {
    this.id = data.id;
    this.enabled = data.enabled;
    this.authorityId = data.authorityId;
    this.authorityUserId = data.authorityUserId;
    this.userId = data.userId;
    this.details = data.details;
  }

  public async isAccessibleBy(
    realm: string,
    a: Authorization,
    tx: PoolClient,
    action: string = "read.basic"
  ): Promise<boolean> {
    /* eslint-disable @typescript-eslint/camelcase */
    const values: { [name: string]: null | string } = {
      current_authorization_id: a.id,
      current_user_id: a.userId,
      ...(a.grantId ? { current_grant_id: a.grantId } : null)
    };
    /* eslint-enable @typescript-eslint/camelcase */

    if (await a.can(tx, values, `${realm}:credential.${this.id}:${action}`)) {
      return true;
    }

    if (
      this.userId === a.userId &&
      (await a.can(
        tx,
        values,
        `${realm}:authority.${this.authorityId}.credentials:${action}`
      ))
    ) {
      return true;
    }

    if (
      this.userId === a.userId &&
      (await a.can(
        tx,
        values,
        `${realm}:user.${this.userId}.credentials:${action}`
      ))
    ) {
      return true;
    }

    return false;
  }

  public abstract authority(
    tx: PoolClient,
    refresh?: boolean
  ): Promise<Authority<any>>;

  public user(tx: PoolClient, refresh: boolean = false): Promise<User> {
    if (!refresh && this._user) {
      return this._user;
    }

    return (this._user = User.read(tx, this.userId));
  }

  public static read<T extends Credential<any>>(
    this: new (data: CredentialData<any>) => T,
    tx: PoolClient,
    id: string,
    options?: { forUpdate: boolean }
  ): Promise<T>;

  public static read<T extends Credential<any>>(
    this: new (data: CredentialData<any>) => T,
    tx: PoolClient,
    id: string[],
    options?: { forUpdate: boolean }
  ): Promise<T[]>;

  public static read<
    M extends {
      [key: string]: { new (data: CredentialData<any>): Credential<any> };
    },
    K extends keyof M
  >(
    tx: PoolClient,
    id: string,
    map: M,
    options?: { forUpdate: boolean }
  ): Promise<InstanceType<M[K]>>;

  public static read<
    M extends {
      [key: string]: { new (data: CredentialData<any>): Credential<any> };
    },
    K extends keyof M
  >(
    tx: PoolClient,
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
      new (data: CredentialData<any>): T;
    },
    tx: PoolClient,
    id: string[] | string,
    mapOrOptions?: M | { forUpdate: boolean },
    optionsOrUndefined?: { forUpdate: boolean }
  ): Promise<InstanceType<M[K]>[] | InstanceType<M[K]> | T | T[]> {
    if (typeof id !== "string" && !id.length) {
      return [];
    }

    const map =
      mapOrOptions && typeof mapOrOptions.forUpdate !== "boolean"
        ? (mapOrOptions as M)
        : undefined;

    const options = (map === mapOrOptions
      ? (optionsOrUndefined as { forUpdate: boolean })
      : mapOrOptions) || { forUpdate: false };

    const result = await tx.query(
      `
      SELECT
        authx.credential_record.entity_id AS id,
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
        authorityId: row.authority_id,
        authorityUserId: row.authority_user_id,
        userId: row.user_id
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

  public static async write<T extends Credential<any>>(
    this: {
      new (data: CredentialData<any>): T;
    },
    tx: PoolClient,
    data: CredentialData<any>,
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
      authorityId: row.authority_id,
      authorityUserId: row.authority_user_id,
      userId: row.user_id
    });
  }
}
