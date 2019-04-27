import { PoolClient } from "pg";
import { User } from "./User";
import { Grant } from "./Grant";
import {
  simplify,
  getIntersection,
  isSuperset,
  isStrictSuperset
} from "scopeutils";
import { NotFoundError } from "../errors";

export interface AuthorizationData {
  readonly id: string;
  readonly enabled: boolean;
  readonly userId: string;
  readonly grantId: null | string;
  readonly secret: string;
  readonly scopes: Iterable<string>;
}

export class Authorization implements AuthorizationData {
  public readonly id: string;
  public readonly enabled: boolean;
  public readonly userId: string;
  public readonly grantId: null | string;
  public readonly secret: string;
  public readonly scopes: string[];

  private _user: null | Promise<User> = null;
  private _grant: null | Promise<Grant> = null;
  private _authorization: null | Promise<Grant> = null;

  public constructor(data: AuthorizationData) {
    this.id = data.id;
    this.enabled = data.enabled;
    this.userId = data.userId;
    this.grantId = data.grantId;
    this.secret = data.secret;
    this.scopes = simplify([...data.scopes]);
  }

  public async isAccessibleBy(
    realm: string,
    a: Authorization,
    tx: PoolClient,
    action: string = "read.basic"
  ): Promise<boolean> {
    // can access all authorizations
    if (await a.can(tx, `${realm}:authorization.*.*.*:${action}`)) {
      return true;
    }

    // can access own authorizations with this authorization
    if (
      this.userId === a.userId &&
      this.grantId === a.grantId &&
      (await a.can(tx, `${realm}:authorization.equal.self.*:${action}`))
    ) {
      return true;
    }

    // can access own authorizations
    if (
      this.userId === a.userId &&
      (await a.can(tx, `${realm}:authorization.equal.self.*:${action}`))
    ) {
      return true;
    }

    // can access grants for assigned clients
    // "assigned" grant scopes only apply for "read" actions
    if (action.split(".")[0] === "read") {
      const grant = await this.grant(tx);
      if (
        grant &&
        (await grant.client(tx)).userIds.has(a.userId) &&
        (await a.can(tx, `${realm}:grant.assigned:${action}`))
      ) {
        return true;
      }
    }

    // can access the authorizations of users with lesser or equal access
    if (await a.can(tx, `${realm}:authorization.equal.*.*:${action}`)) {
      return isSuperset(
        await (await a.user(tx)).access(tx),
        await (await this.user(tx)).access(tx)
      );
    }

    // can access the authorizations of users with lesser access
    if (await a.can(tx, `${realm}:authorization.equal.lesser.*:${action}`)) {
      return isStrictSuperset(
        await (await a.user(tx)).access(tx),
        await (await this.user(tx)).access(tx)
      );
    }

    return false;
  }

  public user(tx: PoolClient, refresh: boolean = false): Promise<User> {
    if (!refresh && this._user) {
      return this._user;
    }

    return (this._user = User.read(tx, this.userId));
  }

  public async grant(
    tx: PoolClient,
    refresh: boolean = false
  ): Promise<null | Grant> {
    if (!this.grantId) {
      return null;
    }

    if (!refresh && this._grant) {
      return this._grant;
    }

    return (this._grant = Grant.read(tx, this.grantId));
  }

  public async access(
    tx: PoolClient,
    refresh: boolean = false
  ): Promise<string[]> {
    const grant = await this.grant(tx, refresh);
    if (grant) {
      return grant.enabled
        ? getIntersection(this.scopes, await grant.access(tx, refresh))
        : [];
    }

    const user = await this.user(tx, refresh);
    return user.enabled
      ? getIntersection(this.scopes, await user.access(tx, refresh))
      : [];
  }

  public async can(
    tx: PoolClient,
    scope: string[] | string,
    refresh: boolean = false
  ): Promise<boolean> {
    return isSuperset(await this.access(tx, refresh), scope);
  }

  public static read(tx: PoolClient, id: string): Promise<Authorization>;
  public static read(tx: PoolClient, id: string[]): Promise<Authorization[]>;
  public static async read(
    tx: PoolClient,
    id: string[] | string
  ): Promise<Authorization[] | Authorization> {
    if (typeof id !== "string" && !id.length) {
      return [];
    }

    const result = await tx.query(
      `
      SELECT
        entity_id AS id,
        enabled,
        user_id,
        grant_id,
        secret,
        scopes
      FROM authx.authorization_record
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

    if (result.rows.length > (typeof id === "string" ? 1 : id.length)) {
      throw new Error(
        "INVARIANT: Read must never return more records than requested."
      );
    }

    if (result.rows.length < (typeof id === "string" ? 1 : id.length)) {
      throw new NotFoundError();
    }

    const authorizations = result.rows.map(
      row =>
        new Authorization({
          ...row,
          userId: row.user_id,
          grantId: row.grant_id
        })
    );

    return typeof id === "string" ? authorizations[0] : authorizations;
  }

  public static async write(
    tx: PoolClient,
    data: AuthorizationData,
    metadata: {
      recordId: string;
      createdByAuthorizationId: string;
      createdByCredentialId: null | string;
      createdAt: Date;
    }
  ): Promise<Authorization> {
    // ensure the credential ID shares the user ID
    if (metadata.createdByCredentialId) {
      const result = await tx.query(
        `
        SELECT user_id
        FROM authx.credential_record
        WHERE
          entity_id = $1
          AND replacement_record_id IS NULL
        `,
        [metadata.createdByCredentialId]
      );

      if (result.rows.length !== 1 || result.rows[0].user_id !== data.userId) {
        throw new Error(
          "If a authorization references a credential, it must belong to the same user as the authorization."
        );
      }
    }

    if (data.grantId) {
      // ensure the grant ID shares the user ID
      const result = await tx.query(
        `
        SELECT user_id
        FROM authx.grant_record
        WHERE
          entity_id = $1
          AND replacement_record_id IS NULL
        `,
        [data.grantId]
      );

      if (result.rows.length !== 1 || result.rows[0].user_id !== data.userId) {
        throw new Error(
          "If a authorization references a grant, it must belong to the same user as the authorization."
        );
      }
    }

    // ensure that the entity ID exists
    await tx.query(
      `
      INSERT INTO authx.authorization
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
      UPDATE authx.authorization_record
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
      INSERT INTO authx.authorization_record
      (
        record_id,
        created_by_authorization_id,
        created_by_credential_id,
        created_at,
        entity_id,
        enabled,
        user_id,
        grant_id,
        secret,
        scopes
      )
      VALUES
        ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING
        entity_id AS id,
        enabled,
        user_id,
        grant_id,
        secret,
        scopes
      `,
      [
        metadata.recordId,
        metadata.createdByAuthorizationId,
        metadata.createdByCredentialId,
        metadata.createdAt,
        data.id,
        data.enabled,
        data.userId,
        data.grantId,
        data.secret,
        simplify([...data.scopes])
      ]
    );

    if (next.rows.length !== 1) {
      throw new Error("INVARIANT: Insert must return exactly one row.");
    }

    const row = next.rows[0];
    return new Authorization({
      ...row,
      userId: row.user_id,
      grantId: row.grant_id
    });
  }
}
