import { ClientBase } from "pg";
import { User } from "./User";
import { Grant } from "./Grant";
import { simplify, getIntersection, isSuperset } from "@authx/scopes";
import { NotFoundError } from "../errors";
import { AuthorizationAction, createV2AuthXScope } from "../util/scopes";

export interface AuthorizationInvocationData {
  readonly id: string;
  readonly entityId: string;
  readonly recordId: null | string;
  readonly format: "bearer" | "basic";
  readonly createdAt: Date;
}

export class AuthorizationInvocation implements AuthorizationInvocationData {
  public readonly id: string;
  public readonly entityId: string;
  public readonly recordId: null | string;
  public readonly format: "bearer" | "basic";
  public readonly createdAt: Date;

  constructor(data: AuthorizationInvocationData) {
    this.id = data.id;
    this.entityId = data.entityId;
    this.recordId = data.recordId;
    this.format = data.format;
    this.createdAt = data.createdAt;
  }
}

export interface AuthorizationRecordData {
  readonly id: string;
  readonly replacementRecordId: null | string;
  readonly entityId: string;
  readonly createdAt: Date;
  readonly createdByAuthorizationId: string;
  readonly createdByCredentialId: null | string;
}

export class AuthorizationRecord implements AuthorizationRecordData {
  public readonly id: string;
  public readonly replacementRecordId: null | string;
  public readonly entityId: string;
  public readonly createdAt: Date;
  public readonly createdByAuthorizationId: string;
  public readonly createdByCredentialId: null | string;

  constructor(data: AuthorizationRecordData) {
    this.id = data.id;
    this.replacementRecordId = data.replacementRecordId;
    this.entityId = data.entityId;
    this.createdAt = data.createdAt;
    this.createdByAuthorizationId = data.createdByAuthorizationId;
    this.createdByCredentialId = data.createdByCredentialId;
  }
}

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
  public readonly recordId: string;
  public readonly enabled: boolean;
  public readonly userId: string;
  public readonly grantId: null | string;
  public readonly secret: string;
  public readonly scopes: string[];

  private _user: null | Promise<User> = null;
  private _grant: null | Promise<Grant> = null;
  private _authorization: null | Promise<Grant> = null;

  public constructor(data: AuthorizationData & { readonly recordId: string }) {
    this.id = data.id;
    this.recordId = data.recordId;
    this.enabled = data.enabled;
    this.userId = data.userId;
    this.grantId = data.grantId;
    this.secret = data.secret;
    this.scopes = simplify([...data.scopes]);
  }

  public async isAccessibleBy(
    realm: string,
    a: Authorization,
    tx: ClientBase,
    action: AuthorizationAction = {
      basic: "r",
      scopes: "",
      secrets: ""
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
            type: "authorization",
            authorizationId: this.id,
            grantId: this.grantId ?? "",
            clientId: (await this.grant(tx))?.clientId ?? "",
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

  public user(tx: ClientBase, refresh: boolean = false): Promise<User> {
    if (!refresh && this._user) {
      return this._user;
    }

    return (this._user = User.read(tx, this.userId));
  }

  public async grant(
    tx: ClientBase,
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
    tx: ClientBase,
    values: {
      currentAuthorizationId: null | string;
      currentUserId: null | string;
      currentGrantId: null | string;
      currentClientId: null | string;
    },
    refresh: boolean = false
  ): Promise<string[]> {
    const grant = await this.grant(tx, refresh);
    if (grant) {
      return grant.enabled
        ? getIntersection(this.scopes, await grant.access(tx, values, refresh))
        : [];
    }

    const user = await this.user(tx, refresh);
    return user.enabled
      ? getIntersection(this.scopes, await user.access(tx, values, refresh))
      : [];
  }

  public async can(
    tx: ClientBase,
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

  public async records(tx: ClientBase): Promise<AuthorizationRecord[]> {
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
        new AuthorizationRecord({
          ...row,
          replacementRecordId: row.replacement_record_id,
          createdByAuthorizationId: row.created_by_authorization_id,
          createdByCredentialId: row.created_by_credential_id,
          createdAt: row.created_at,
          entityId: row.entity_id
        })
    );
  }

  public async invoke(
    tx: ClientBase,
    data: {
      id: string;
      format: string;
      createdAt: Date;
    }
  ): Promise<AuthorizationInvocation> {
    // insert the new invocation
    const result = await tx.query(
      `
      INSERT INTO authx.authorization_invocation
      (
        invocation_id,
        entity_id,
        record_id,
        created_at,
        format
      )
      VALUES
        ($1, $2, $3, $4, $5)
      RETURNING
        invocation_id AS id,
        entity_id,
        record_id,
        created_at,
        format
      `,
      [data.id, this.id, this.recordId, data.createdAt, data.format]
    );

    if (result.rows.length !== 1) {
      throw new Error("INVARIANT: Insert must return exactly one row.");
    }

    const row = result.rows[0];

    return new AuthorizationInvocation({
      id: row.id,
      entityId: row.entity_id,
      recordId: row.record_id,
      format: row.format,
      createdAt: row.created_at
    });
  }

  public async invocations(tx: ClientBase): Promise<AuthorizationInvocation[]> {
    const result = await tx.query(
      `
      SELECT
        invocation_id as id,
        record_id,
        entity_id,
        format,
        created_at
      FROM authx.authorization_invocation
      WHERE entity_id = $1
      ORDER BY created_at DESC
      `,
      [this.id]
    );

    return result.rows.map(
      row =>
        new AuthorizationInvocation({
          ...row,
          recordId: row.record_id,
          entityId: row.entity_id,
          createdAt: row.created_at
        })
    );
  }

  public static read(
    tx: ClientBase,
    id: string,
    options?: { forUpdate: boolean }
  ): Promise<Authorization>;
  public static read(
    tx: ClientBase,
    id: string[],
    options?: { forUpdate: boolean }
  ): Promise<Authorization[]>;
  public static async read(
    tx: ClientBase,
    id: string[] | string,
    options: { forUpdate: boolean } = { forUpdate: false }
  ): Promise<Authorization[] | Authorization> {
    if (typeof id !== "string" && !id.length) {
      return [];
    }

    const result = await tx.query(
      `
      SELECT
        entity_id AS id,
        record_id,
        enabled,
        user_id,
        grant_id,
        secret,
        scopes
      FROM authx.authorization_record
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
          recordId: row.record_id,
          userId: row.user_id,
          grantId: row.grant_id
        })
    );

    return typeof id === "string" ? authorizations[0] : authorizations;
  }

  public static async write(
    tx: ClientBase,
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
        record_id,
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
      recordId: row.record_id,
      userId: row.user_id,
      grantId: row.grant_id
    });
  }
}
