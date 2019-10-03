import { PoolClient } from "pg";
import { Authority, Role } from "@authx/authx";
import { SamlCredential } from "./SamlCredential";

// Authority
// ---------

export interface SamlAuthorityDetails {
  privateKeys: string[];
  publicKeys: string[];
  forcesReauthentication: boolean;
  defaultRedirect: string;

  idpLoginUrl: string;
  idpLogoutUrl: string;
  idpCertificates: string[];

  createsUnmatchedUsers: boolean;
  assignsCreatedUsersToRoleIds: string[];
}

export class SamlAuthority extends Authority<SamlAuthorityDetails> {
  private _credentials: null | Promise<SamlCredential[]> = null;
  private _assignsCreatedUsersToRoles: null | Promise<Role[]> = null;

  public credentials(
    tx: PoolClient,
    refresh: boolean = false
  ): Promise<SamlCredential[]> {
    if (!refresh && this._credentials) {
      return this._credentials;
    }

    return (this._credentials = (async () =>
      SamlCredential.read(
        tx,
        (await tx.query(
          `
              SELECT entity_id AS id
              FROM authx.credential_records
              WHERE
                authority_id = $1
                AND replacement_record_id IS NULL
              `,
          [this.id]
        )).rows.map(({ id }) => id)
      ))());
  }

  public async credential(
    tx: PoolClient,
    authorityUserId: string
  ): Promise<null | SamlCredential> {
    const results = await tx.query(
      `
      SELECT entity_id AS id
      FROM authx.credential_record
      WHERE
        authority_id = $1
        AND authority_user_id = $2
        AND enabled = true
        AND replacement_record_id IS NULL
    `,
      [this.id, authorityUserId]
    );

    if (results.rows.length > 1) {
      throw new Error(
        "INVARIANT: There cannot be more than one active credential for the same user and authority."
      );
    }

    if (!results.rows[0]) return null;

    return SamlCredential.read(tx, results.rows[0].id);
  }

  public async assignsCreatedUsersToRoles(
    tx: PoolClient,
    refresh?: boolean
  ): Promise<Role[]> {
    if (!refresh && this._assignsCreatedUsersToRoles) {
      return this._assignsCreatedUsersToRoles;
    }

    if (!this.details.assignsCreatedUsersToRoleIds) {
      return [];
    }

    return (this._assignsCreatedUsersToRoles = Role.read(
      tx,
      this.details.assignsCreatedUsersToRoleIds
    ));
  }
}
