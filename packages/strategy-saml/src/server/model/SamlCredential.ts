import { Credential, DataLoaderExecutor } from "@authx/authx";
import { ClientBase, Pool } from "pg";
import { SamlAuthority } from "./SamlAuthority.js";

// eslint-disable-next-line
export interface SamlCredentialDetails {}

export class SamlCredential extends Credential<SamlCredentialDetails> {
  async authority(
    tx: Pool | ClientBase | DataLoaderExecutor,
  ): Promise<SamlAuthority> {
    return tx instanceof DataLoaderExecutor
      ? (SamlAuthority.read(tx, this.authorityId) as Promise<SamlAuthority>)
      : (SamlAuthority.read(tx, this.authorityId) as Promise<SamlAuthority>);
  }
}
