import { ClientBase, Pool } from "pg";
import { Authority, Role, DataLoaderExecutor } from "@authx/authx";
import { EmailAuthority } from "@authx/strategy-email";
import { OpenIdCredential } from "./OpenIdCredential";

// Authority
// ---------

export interface OpenIdAuthorityDetails {
  authUrl: string;
  tokenUrl: string;
  clientId: string;
  clientSecret: string;

  restrictsAccountsToHostedDomains: string[];

  emailAuthorityId: null | string;

  matchesUsersByEmail: boolean;
  createsUnmatchedUsers: boolean;
  assignsCreatedUsersToRoleIds: string[];
}

export class OpenIdAuthority extends Authority<OpenIdAuthorityDetails> {
  private _credentials: null | Promise<OpenIdCredential[]> = null;
  private _emailAuthority: null | Promise<EmailAuthority> = null;
  private _assignsCreatedUsersToRoles: null | Promise<Role[]> = null;

  public credentials(
    tx: Pool | ClientBase | DataLoaderExecutor,
    refresh: boolean = false
  ): Promise<OpenIdCredential[]> {
    if (!refresh && this._credentials) {
      return this._credentials;
    }

    return (this._credentials = (async () =>
      OpenIdCredential.read(
        tx,
        (
          await (tx instanceof DataLoaderExecutor ? tx.tx : tx).query(
            `
              SELECT entity_id AS id
              FROM authx.credential_records
              WHERE
                authority_id = $1
                AND replacement_record_id IS NULL
              `,
            [this.id]
          )
        ).rows.map(({ id }) => id)
      ))());
  }

  public async credential(
    tx: Pool | ClientBase | DataLoaderExecutor,
    authorityUserId: string
  ): Promise<null | OpenIdCredential> {
    const results = await (tx instanceof DataLoaderExecutor ? tx.tx : tx).query(
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

    return OpenIdCredential.read(tx, results.rows[0].id);
  }

  public async emailAuthority(
    tx: Pool | ClientBase | DataLoaderExecutor,
    refresh?: boolean
  ): Promise<null | EmailAuthority> {
    if (!refresh && this._emailAuthority) {
      return this._emailAuthority;
    }

    if (!this.details.emailAuthorityId) {
      return null;
    }

    return (this._emailAuthority = EmailAuthority.read(
      tx,
      this.details.emailAuthorityId
    ));
  }

  public async assignsCreatedUsersToRoles(
    tx: Pool | ClientBase | DataLoaderExecutor,
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
