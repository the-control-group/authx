import { Pool, ClientBase } from "pg";
import { Credential, DataLoaderExecutor } from "@authx/authx";
import { EmailAuthority } from "./EmailAuthority.js";

// Credential
// ----------

// eslint-disable-next-line
export interface EmailCredentialDetails {}

export class EmailCredential extends Credential<EmailCredentialDetails> {
  public authority(
    tx: Pool | ClientBase | DataLoaderExecutor,
  ): Promise<EmailAuthority> {
    // This explicit check is necessary to work around a TS limitation with
    // unions in overloaded functions.
    if (tx instanceof DataLoaderExecutor) {
      return EmailAuthority.read(tx, this.authorityId);
    }

    return EmailAuthority.read(tx, this.authorityId);
  }
}
