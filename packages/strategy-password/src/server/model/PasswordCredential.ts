import { Pool, ClientBase } from "pg";
import { Credential, DataLoaderExecutor } from "@authx/authx";
import {
  PasswordAuthorityDetails,
  PasswordAuthority,
} from "./PasswordAuthority.js";

// Credential
// ----------

export interface PasswordCredentialDetails {
  hash: string;
}

export class PasswordCredential extends Credential<PasswordCredentialDetails> {
  public authority(
    tx: Pool | ClientBase | DataLoaderExecutor,
  ): Promise<PasswordAuthority> {
    // This explicit check is necessary to work around a TS limitation with
    // unions in overloaded functions.
    if (tx instanceof DataLoaderExecutor) {
      return PasswordAuthority.read<
        PasswordAuthorityDetails,
        PasswordAuthority
      >(tx, this.authorityId);
    }

    return PasswordAuthority.read<PasswordAuthorityDetails, PasswordAuthority>(
      tx,
      this.authorityId,
    );
  }
}
