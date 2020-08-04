import { Credential, DataLoaderExecutor } from "@authx/authx";
import {
  PasswordAuthorityDetails,
  PasswordAuthority,
} from "./PasswordAuthority";

// Credential
// ----------

export interface PasswordCredentialDetails {
  hash: string;
}

export class PasswordCredential extends Credential<PasswordCredentialDetails> {
  public authority(tx: DataLoaderExecutor): Promise<PasswordAuthority> {
    return tx instanceof DataLoaderExecutor
      ? // Some silliness to help typescript...
        PasswordAuthority.read<PasswordAuthorityDetails, PasswordAuthority>(
          tx,
          this.authorityId
        )
      : PasswordAuthority.read<PasswordAuthorityDetails, PasswordAuthority>(
          tx,
          this.authorityId
        );
  }
}
