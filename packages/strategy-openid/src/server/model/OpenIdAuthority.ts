import { Pool, ClientBase } from "pg";
import { Authority, Role, DataLoaderExecutor, QueryCache } from "@authx/authx";
import { EmailAuthority } from "@authx/strategy-email";
import { OpenIdCredential } from "./OpenIdCredential.js";

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
  public async credentials(
    tx: Pool | ClientBase | DataLoaderExecutor,
  ): Promise<OpenIdCredential[]> {
    const ids = (
      await queryCache.query(
        tx,
        `
          SELECT entity_id AS id
          FROM authx.credential_records
          WHERE
            authority_id = $1
            AND replacement_record_id IS NULL
          ORDER BY id ASC
          `,
        [this.id],
      )
    ).rows.map(({ id }) => id);

    return tx instanceof DataLoaderExecutor
      ? OpenIdCredential.read(tx, ids)
      : OpenIdCredential.read(tx, ids);
  }

  public async credential(
    tx: Pool | ClientBase | DataLoaderExecutor,
    authorityUserId: string,
  ): Promise<null | OpenIdCredential> {
    const results = await queryCache.query(
      tx,
      `
      SELECT entity_id AS id
      FROM authx.credential_record
      WHERE
        authority_id = $1
        AND authority_user_id = $2
        AND enabled = true
        AND replacement_record_id IS NULL
      `,
      [this.id, authorityUserId],
    );

    if (results.rows.length > 1) {
      throw new Error(
        "INVARIANT: There cannot be more than one active credential for the same user and authority.",
      );
    }

    if (!results.rows[0]) return null;

    return tx instanceof DataLoaderExecutor
      ? (OpenIdCredential.read(
          tx,
          results.rows[0].id,
        ) as Promise<OpenIdCredential>)
      : (OpenIdCredential.read(
          tx,
          results.rows[0].id,
        ) as Promise<OpenIdCredential>);
  }

  public async emailAuthority(
    tx: DataLoaderExecutor,
  ): Promise<null | EmailAuthority> {
    if (!this.details.emailAuthorityId) {
      return null;
    }

    return EmailAuthority.read(tx, this.details.emailAuthorityId);
  }

  public async assignsCreatedUsersToRoles(
    tx: DataLoaderExecutor,
  ): Promise<Role[]> {
    if (!this.details.assignsCreatedUsersToRoleIds) {
      return [];
    }

    return tx instanceof DataLoaderExecutor
      ? Role.read(tx, this.details.assignsCreatedUsersToRoleIds)
      : Role.read(tx, this.details.assignsCreatedUsersToRoleIds);
  }
}

const queryCache = new QueryCache<{ id: string }>();
