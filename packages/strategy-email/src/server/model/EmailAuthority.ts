import { ClientBase } from "pg";
import { Authority } from "@authx/authx";
import { EmailCredential } from "./EmailCredential";

// Authority
// ---------

export interface EmailAuthorityDetails {
  privateKey: string;
  publicKeys: string[];
  proofValidityDuration: number;
  authenticationEmailSubject: string;
  authenticationEmailText: string;
  authenticationEmailHtml: string;
  verificationEmailSubject: string;
  verificationEmailText: string;
  verificationEmailHtml: string;
}

export class EmailAuthority extends Authority<EmailAuthorityDetails> {
  private _credentials: null | Promise<EmailCredential[]> = null;

  public credentials(
    tx: ClientBase,
    refresh: boolean = false
  ): Promise<EmailCredential[]> {
    if (!refresh && this._credentials) {
      return this._credentials;
    }

    return (this._credentials = (async () =>
      EmailCredential.read(
        tx,
        (
          await tx.query(
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
    tx: ClientBase,
    authorityUserId: string
  ): Promise<null | EmailCredential> {
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

    return EmailCredential.read(tx, results.rows[0].id);
  }
}
