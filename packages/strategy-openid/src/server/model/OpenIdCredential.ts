import { ClientBase, Pool } from "pg";
import { Credential, DataLoaderExecutor } from "@authx/authx";
import { OpenIdAuthority } from "./OpenIdAuthority";

// Credential
// ----------

// eslint-disable-next-line
export interface OpenIdCredentialDetails {}

export class OpenIdCredential extends Credential<{}> {
  private _authority: null | Promise<OpenIdAuthority> = null;

  public authority(
    tx: Pool | ClientBase | DataLoaderExecutor,
    refresh: boolean = false
  ): Promise<OpenIdAuthority> {
    if (!refresh && this._authority) {
      return this._authority;
    }

    return (this._authority = OpenIdAuthority.read(tx, this.authorityId));
  }
}
