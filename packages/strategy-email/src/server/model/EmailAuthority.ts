import { Authority, DataLoaderExecutor } from "@authx/authx";
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
  public credentials(tx: DataLoaderExecutor): Promise<EmailCredential[]> {
    return (async () =>
      EmailCredential.read(
        tx,
        (
          await tx.connection.query(
            `
            SELECT entity_id AS id
            FROM authx.credential_records
            WHERE
              authority_id = $1
              AND replacement_record_id IS NULL
            ORDER BY id ASC
            `,
            [this.id]
          )
        ).rows.map(({ id }) => id)
      ))();
  }

  public async credential(
    tx: DataLoaderExecutor,
    authorityUserId: string
  ): Promise<null | EmailCredential> {
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

    return EmailCredential.read(tx, results.rows[0].id);
  }
}
