import { ClientBase } from "pg";
import { Credential } from "@authx/authx";
import { EmailAuthority } from "./EmailAuthority";

// Credential
// ----------

// eslint-disable-next-line
export interface EmailCredentialDetails {}

export class EmailCredential extends Credential<{}> {
  private _authority: null | Promise<EmailAuthority> = null;

  public authority(
    tx: ClientBase,
    refresh: boolean = false
  ): Promise<EmailAuthority> {
    if (!refresh && this._authority) {
      return this._authority;
    }

    return (this._authority = EmailAuthority.read(tx, this.authorityId));
  }
}
