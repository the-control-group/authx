import { Pool, ClientBase } from "pg";
import { Credential, DataLoaderExecutor } from "@authx/authx";
import { OpenIdAuthority } from "./OpenIdAuthority.js";

// Credential
// ----------

// eslint-disable-next-line
export interface OpenIdCredentialDetails {}

export class OpenIdCredential extends Credential<OpenIdCredentialDetails> {
  public authority(
    tx: Pool | ClientBase | DataLoaderExecutor,
  ): Promise<OpenIdAuthority> {
    // This explicit check is necessary to work around a TS limitation with
    // unions in overloaded functions.
    if (tx instanceof DataLoaderExecutor) {
      return OpenIdAuthority.read(
        tx,
        this.authorityId,
      ) as Promise<OpenIdAuthority>;
    }

    return OpenIdAuthority.read(
      tx,
      this.authorityId,
    ) as Promise<OpenIdAuthority>;
  }
}
