import { Pool, ClientBase } from "pg";
import { Credential, DataLoaderExecutor } from "@authx/authx";
import { EmailAuthority } from "./EmailAuthority.js";
export interface EmailCredentialDetails {
}
export declare class EmailCredential extends Credential<EmailCredentialDetails> {
    authority(tx: Pool | ClientBase | DataLoaderExecutor): Promise<EmailAuthority>;
}
