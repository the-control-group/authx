import { PoolClient } from "pg";
import { Authority, AuthorityData } from "../models/Authority";
import { Credential, CredentialData } from "../models/Credential";

interface PasswordAuthorityDetails {
  password: string;
}

export class PasswordAuthority extends Authority<PasswordAuthorityDetails> {
  // public async credentials(tx: PoolClient): Promise<PasswordCredential[]> {
  //   return PasswordCredential.read(
  //     tx,
  //     (await tx.query(
  //       `
  //         SELECT entity_id AS id
  //         FROM authx.credential_records
  //         WHERE
  //           authority_id = $1
  //           AND replacement_record_id IS NULL
  //         `,
  //       [this.id]
  //     )).rows.map(({ id }) => id),
  //     { password: PasswordCredential }
  //   );
  // }
  // public static write(
  //   tx: PoolClient,
  //   data: AuthorityData<PasswordAuthorityDetails>,
  //   metadata: {
  //     recordId: string;
  //     createdBySessionId: string;
  //     createdAt: Date;
  //   }
  // ): Promise<PasswordAuthority>;
}

interface PasswordCredentialDetails {}

export class PasswordCredential extends Credential<PasswordCredentialDetails> {
  public authority(tx: PoolClient): Promise<PasswordAuthority> {
    return PasswordAuthority.read(tx, this.authorityId);
  }

  public static write(
    tx: PoolClient,
    data: CredentialData<PasswordCredentialDetails>,
    metadata: {
      recordId: string;
      createdBySessionId: string;
      createdAt: Date;
    }
  ): Promise<PasswordCredential>;
}

export class PasswordAuthority2 extends Authority<PasswordAuthorityDetails> {}

const a = Authority.read("" as any, "foo", {
  pw2: PasswordAuthority2,
  password: PasswordAuthority
});
