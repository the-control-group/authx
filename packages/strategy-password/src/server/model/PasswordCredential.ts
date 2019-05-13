import { PoolClient } from "pg";
import { Credential } from "@authx/authx";
import { PasswordAuthority } from "./PasswordAuthority";

// Credential
// ----------

export interface PasswordCredentialDetails {
  hash: string;
}

export class PasswordCredential extends Credential<PasswordCredentialDetails> {
  private _authority: null | Promise<PasswordAuthority> = null;

  public authority(
    tx: PoolClient,
    refresh: boolean = false
  ): Promise<PasswordAuthority> {
    if (!refresh && this._authority) {
      return this._authority;
    }

    return (this._authority = PasswordAuthority.read(tx, this.authorityId));
  }
}
