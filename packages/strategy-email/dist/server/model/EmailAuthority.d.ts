import { Pool, ClientBase } from "pg";
import { Authority, DataLoaderExecutor } from "@authx/authx";
import { EmailCredential } from "./EmailCredential.js";
export interface EmailAuthorityDetails {
    privateKey: string;
    publicKeys: string[];
    proofValidityDuration: number;
    authenticationEmailSubject: string;
    authenticationEmailText: string;
    authenticationEmailHtml: string;
    verificationEmailSubject: string;
    verificationEmailText: string;
    verificationEmailHtml: string;
}
export declare class EmailAuthority extends Authority<EmailAuthorityDetails> {
    credentials(tx: Pool | ClientBase | DataLoaderExecutor): Promise<EmailCredential[]>;
    credential(tx: Pool | ClientBase | DataLoaderExecutor, authorityUserId: string): Promise<null | EmailCredential>;
}
