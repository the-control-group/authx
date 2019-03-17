import { PoolClient } from "pg";
import { Authority } from "./Authority";
import { User } from "./User";
import { Contact } from "./Contact";
import { Token } from "./Token";
import { NotFoundError } from "../errors";

import { isSuperset, isStrictSuperset } from "scopeutils";

export interface CredentialData<C> {
  readonly id: string;
  readonly enabled: boolean;
  readonly authorityId: string;
  readonly authorityUserId: string;
  readonly userId: string;
  readonly contact: null | Contact;
  readonly details: C;
}

export abstract class Credential<C> implements CredentialData<C> {
  public readonly id: string;
  public readonly enabled: boolean;
  public readonly authorityId: string;
  public readonly authorityUserId: string;
  public readonly userId: string;
  public readonly contact: null | Contact;
  public readonly details: C;

  private _user: null | Promise<User> = null;

  public constructor(data: CredentialData<C>) {
    this.id = data.id;
    this.enabled = data.enabled;
    this.authorityId = data.authorityId;
    this.authorityUserId = data.authorityUserId;
    this.userId = data.userId;
    this.contact = data.contact;
    this.details = data.details;
  }

  public async isAccessibleBy(
    realm: string,
    t: Token,
    tx: PoolClient,
    action: string = "read.basic"
  ): Promise<boolean> {
    // can view all credentials
    if (await t.can(tx, `${realm}:credential.*.*:${action}`)) {
      return true;
    }

    // can view own credentials
    if (
      this.userId === t.userId &&
      (await t.can(tx, `${realm}:credential.equal.self:${action}`))
    ) {
      return true;
    }

    // can view the credentials of users with lesser or equal access
    if (await t.can(tx, `${realm}:credential.equal.*:${action}`)) {
      return isSuperset(
        await (await t.user(tx)).access(tx),
        await (await this.user(tx)).access(tx)
      );
    }

    // can view the credentials of users with lesser access
    if (await t.can(tx, `${realm}:credential.equal.lesser:${action}`)) {
      return isStrictSuperset(
        await (await t.user(tx)).access(tx),
        await (await this.user(tx)).access(tx)
      );
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
    id: string
  ): Promise<T>;

  public static read<T extends Credential<any>>(
    this: new (data: CredentialData<any>) => T,
    tx: PoolClient,
    id: string[]
  ): Promise<T[]>;

  public static read<
    M extends {
      [key: string]: { new (data: CredentialData<any>): Credential<any> };
    },
    K extends keyof M
  >(tx: PoolClient, id: string, map: M): Promise<InstanceType<M[K]>>;

  public static read<
    M extends {
      [key: string]: { new (data: CredentialData<any>): Credential<any> };
    },
    K extends keyof M
  >(tx: PoolClient, id: string[], map: M): Promise<InstanceType<M[K]>[]>;

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
    map?: M
  ): Promise<InstanceType<M[K]>[] | InstanceType<M[K]> | T | T[]> {
    if (typeof id !== "string" && !id.length) {
      return [];
    }

    const result = await tx.query(
      `
      SELECT
        authx.credential_record.entity_id AS id,
        authx.credential_record.enabled,
        authx.credential_record.authority_id,
        authx.credential_record.authority_user_id,
        authx.credential_record.user_id,
        authx.credential_record.contact,
        authx.credential_record.details,
        authx.authority_record.strategy
      FROM authx.credential_record
      JOIN authx.authority_record
        ON authx.authority_record.entity_id = authx.credential_record.authority_id
        AND authx.authority_record.replacement_record_id IS NULL
      WHERE
        authx.credential_record.entity_id = ANY($1)
        AND authx.credential_record.replacement_record_id IS NULL
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
      createdByTokenId: string;
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
        created_by_token_id,
        created_at,
        entity_id,
        enabled,
        authority_id,
        authority_user_id,
        user_id,
        contact,
        details
      )
      VALUES
        ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING
        entity_id AS id,
        enabled,
        authority_id,
        authority_user_id,
        user_id,
        contact,
        details
      `,
      [
        metadata.recordId,
        metadata.createdByTokenId,
        metadata.createdAt,
        data.id,
        data.enabled,
        data.authorityId,
        data.authorityUserId,
        data.userId,
        data.contact,
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
