import { PoolClient } from "pg";
import { Credential } from "@authx/authx";
import { SamlAuthority } from "./SamlAuthority";

// Credential
// ----------

// eslint-disable-next-line
export interface SamlCredentialDetails {}

export class SamlCredential extends Credential<{}> {
  private _authority: null | Promise<SamlAuthority> = null;

  public authority(
    tx: PoolClient,
    refresh: boolean = false
  ): Promise<SamlAuthority> {
    if (!refresh && this._authority) {
      return this._authority;
    }

    return (this._authority = SamlAuthority.read(tx, this.authorityId));
  }
}
