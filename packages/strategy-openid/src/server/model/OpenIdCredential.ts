import { Pool, ClientBase } from "pg";
import { Credential, DataLoaderExecutor } from "@authx/authx";
import { OpenIdAuthority } from "./OpenIdAuthority";

// Credential
// ----------

// eslint-disable-next-line
export interface OpenIdCredentialDetails {}

export class OpenIdCredential extends Credential<OpenIdCredentialDetails> {
  public authority(
    tx: Pool | ClientBase | DataLoaderExecutor
  ): Promise<OpenIdAuthority> {
    return tx instanceof DataLoaderExecutor
      ? (OpenIdAuthority.read(tx, this.authorityId) as Promise<OpenIdAuthority>)
      : (OpenIdAuthority.read(tx, this.authorityId) as Promise<
          OpenIdAuthority
        >);
  }
}
