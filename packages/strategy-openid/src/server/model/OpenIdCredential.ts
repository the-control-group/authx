import { Credential, DataLoaderExecutor } from "@authx/authx";
import { OpenIdAuthority } from "./OpenIdAuthority";

// Credential
// ----------

// eslint-disable-next-line
export interface OpenIdCredentialDetails {}

export class OpenIdCredential extends Credential<OpenIdCredentialDetails> {
  public authority(tx: DataLoaderExecutor): Promise<OpenIdAuthority> {
    return OpenIdAuthority.read(tx, this.authorityId) as Promise<
      OpenIdAuthority
    >;
  }
}
