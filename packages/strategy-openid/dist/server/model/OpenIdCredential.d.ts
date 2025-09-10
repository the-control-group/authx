import { Pool, ClientBase } from "pg";
import { Credential, DataLoaderExecutor } from "@authx/authx";
import { OpenIdAuthority } from "./OpenIdAuthority.js";
export interface OpenIdCredentialDetails {
}
export declare class OpenIdCredential extends Credential<OpenIdCredentialDetails> {
    authority(tx: Pool | ClientBase | DataLoaderExecutor): Promise<OpenIdAuthority>;
}
