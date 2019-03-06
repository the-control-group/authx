import { PoolClient } from "pg";
import { Authority } from "./Authority";
import { User } from "./User";
import { Profile } from "../util/Profile";

const AUTHORITY = Symbol("authority");
const USER = Symbol("user");

export class Credential<T = {}> {
  public id: string;
  public enabled: boolean;
  public authorityId: string;
  public authorityUserId: string;
  public userId: string;
  public profile: null | Profile;
  public details: T;

  private [AUTHORITY]: null | Promise<Authority> = null;
  private [USER]: null | Promise<User> = null;

  public constructor(data: {
    id: string;
    enabled: boolean;
    authorityId: string;
    authorityUserId: string;
    userId: string;
    profile: null | Profile;
    details: T;
  }) {
    this.id = data.id;
    this.enabled = data.enabled;
    this.authorityId = data.authorityId;
    this.authorityUserId = data.authorityUserId;
    this.userId = data.userId;
    this.profile = data.profile;
    this.details = data.details;
  }

  public async authority(
    tx: PoolClient,
    refresh: boolean = false
  ): Promise<Authority> {
    const authority = this[AUTHORITY];
    if (authority && !refresh) {
      return authority;
    }

    return (this[AUTHORITY] = (async () => {
      const authorities = await Authority.read(tx, [this.authorityId]);
      if (authorities.length !== 1) {
        throw new Error("INVARIANT: Exactly one user must be returned.");
      }

      return authorities[0];
    })());
  }

  public async user(tx: PoolClient, refresh: boolean = false): Promise<User> {
    const user = this[USER];
    if (user && !refresh) {
      return user;
    }

    return (this[USER] = (async () => {
      const users = await User.read(tx, [this.userId]);
      if (users.length !== 1) {
        throw new Error("INVARIANT: Exactly one user must be returned.");
      }

      return users[0];
    })());
  }

  public static async read(
    tx: PoolClient,
    id: string | string[]
  ): Promise<Credential[]> {
    const result = await tx.query(
      `
      SELECT
        entity_id AS id,
        enabled,
        authority_id,
        authority_user_id,
        user_id,
        profile,
        details
      FROM authx.credential_record
      WHERE
        entity_id = ANY($1)
        AND replacement_id IS NULL
      `,
      [id]
    );

    return result.rows.map(
      row =>
        new Credential({
          ...row,
          authorityId: row.authority_id,
          authorityUserId: row.authority_user_id,
          userId: row.user_id
        })
    );
  }

  public static async write(
    tx: PoolClient,
    data: Credential,
    metadata: {
      recordId: string;
      createdByCredentialId: string;
      createdAt: Date;
    }
  ): Promise<Credential> {
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
      SET replacement_id = $2
      WHERE
        entity_id = $1
        AND replacement_id IS NULL
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
      INSERT INTO authx.credential_record
      (
        id,
        created_by_credential_id,
        created_at,
        entity_id,
        enabled,
        authority_id,
        authority_user_id,
        user_id,
        profile,
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
        profile,
        details
      `,
      [
        metadata.recordId,
        metadata.createdByCredentialId,
        metadata.createdAt,
        data.id,
        data.enabled,
        data.authorityId,
        data.authorityUserId,
        data.userId,
        data.profile,
        data.details
      ]
    );

    if (next.rows.length !== 1) {
      throw new Error("INVARIANT: Insert must return exactly one row.");
    }

    const row = next.rows[0];
    return new Credential({
      ...row,
      authorityId: row.authority_id,
      authorityUserId: row.authority_user_id,
      userId: row.user_id
    });
  }
}
