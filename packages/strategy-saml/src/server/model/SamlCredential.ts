import { Credential, DataLoaderExecutor } from "@authx/authx";
import { ClientBase, Pool } from "pg";
import { SamlAuthority } from "./SamlAuthority.js";

// eslint-disable-next-line
export interface SamlCredentialDetails {}

export class SamlCredential extends Credential<SamlCredentialDetails> {
  async authority(
    tx: Pool | ClientBase | DataLoaderExecutor,
  ): Promise<SamlAuthority> {
    // This explicit check is necessary to work around a TS limitation with
    // unions in overloaded functions.
    if (tx instanceof DataLoaderExecutor) {
      return SamlAuthority.read(tx, this.authorityId) as Promise<SamlAuthority>;
    }

    return SamlAuthority.read(tx, this.authorityId) as Promise<SamlAuthority>;
  }
}
