import { ClientBase, Pool } from "pg";
import { Credential, DataLoaderExecutor } from "@authx/authx";
import {
  PasswordAuthorityDetails,
  PasswordAuthority
} from "./PasswordAuthority";

// Credential
// ----------

export interface PasswordCredentialDetails {
  hash: string;
}

export class PasswordCredential extends Credential<PasswordCredentialDetails> {
  private _authority: null | Promise<PasswordAuthority> = null;

  public authority(
    tx: Pool | ClientBase | DataLoaderExecutor,
    refresh: boolean = false
  ): Promise<PasswordAuthority> {
    if (!refresh && this._authority) {
      return this._authority;
    }

    return (this._authority =
      tx instanceof DataLoaderExecutor
        ? // Some silliness to help typescript...
          PasswordAuthority.read<PasswordAuthorityDetails, PasswordAuthority>(
            tx,
            this.authorityId
          )
        : PasswordAuthority.read<PasswordAuthorityDetails, PasswordAuthority>(
            tx,
            this.authorityId
          ));
  }
}
