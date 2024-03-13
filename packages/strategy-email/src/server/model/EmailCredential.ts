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
    return tx instanceof DataLoaderExecutor
      ? EmailAuthority.read(tx, this.authorityId)
      : EmailAuthority.read(tx, this.authorityId);
  }
}
