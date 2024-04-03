import { Pool, ClientBase } from "pg";
import { Authority, DataLoaderExecutor, QueryCache } from "@authx/authx";
import {
  PasswordCredentialDetails,
  PasswordCredential,
} from "./PasswordCredential.js";

// Authority
// ---------

export interface PasswordAuthorityDetails {
  rounds: number;
}

export class PasswordAuthority extends Authority<PasswordAuthorityDetails> {
  public async credentials(
    tx: Pool | ClientBase | DataLoaderExecutor,
  ): Promise<PasswordCredential[]> {
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

    // This explicit check is necessary to work around a TS limitation with
    // unions in overloaded functions.
    if (tx instanceof DataLoaderExecutor) {
      return PasswordCredential.read(tx, ids);
    }

    return PasswordCredential.read(tx, ids);
  }

  public async credential(
    tx: Pool | ClientBase | DataLoaderExecutor,
    authorityUserId: string,
  ): Promise<null | PasswordCredential> {
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

    // This explicit check is necessary to work around a TS limitation with
    // unions in overloaded functions.
    if (tx instanceof DataLoaderExecutor) {
      return PasswordCredential.read<
        PasswordCredentialDetails,
        PasswordCredential
      >(tx, results.rows[0].id);
    }

    return PasswordCredential.read<
      PasswordCredentialDetails,
      PasswordCredential
    >(tx, results.rows[0].id);
  }
}

const queryCache = new QueryCache<{ id: string }>();
