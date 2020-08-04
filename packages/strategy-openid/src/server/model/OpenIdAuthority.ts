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
  public credentials(tx: DataLoaderExecutor): Promise<OpenIdCredential[]> {
    return (async () =>
      OpenIdCredential.read(
        tx,
        (
          await tx.connection.query(
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
      ))();
  }

  public async credential(
    tx: DataLoaderExecutor,
    authorityUserId: string
  ): Promise<null | OpenIdCredential> {
    const results = await tx.connection.query(
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
    tx: DataLoaderExecutor
  ): Promise<null | EmailAuthority> {
    if (!this.details.emailAuthorityId) {
      return null;
    }

    return EmailAuthority.read(tx, this.details.emailAuthorityId);
  }

  public async assignsCreatedUsersToRoles(
    tx: DataLoaderExecutor
  ): Promise<Role[]> {
    if (!this.details.assignsCreatedUsersToRoleIds) {
      return [];
    }

    return Role.read(tx, this.details.assignsCreatedUsersToRoleIds);
  }
}
