import { Credential, DataLoaderExecutor } from "@authx/authx";
import { EmailAuthority } from "./EmailAuthority";

// Credential
// ----------

// eslint-disable-next-line
export interface EmailCredentialDetails {}

export class EmailCredential extends Credential<EmailCredentialDetails> {
  public authority(tx: DataLoaderExecutor): Promise<EmailAuthority> {
    return EmailAuthority.read(tx, this.authorityId);
  }
}
