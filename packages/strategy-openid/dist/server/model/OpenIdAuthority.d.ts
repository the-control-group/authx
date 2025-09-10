import { Pool, ClientBase } from "pg";
import { Authority, Role, DataLoaderExecutor } from "@authx/authx";
import { EmailAuthority } from "@authx/strategy-email";
import { OpenIdCredential } from "./OpenIdCredential.js";
export interface OpenIdAuthorityDetails {
    authUrl: string;
    tokenUrl: string;
    clientId: string;
    clientSecret: string;
    restrictsAccountsToHostedDomains: string[];
    emailAuthorityId: null | string;
    matchesUsersByEmail: boolean;
    createsUnmatchedUsers: boolean;
    assignsCreatedUsersToRoleIds: string[];
}
export declare class OpenIdAuthority extends Authority<OpenIdAuthorityDetails> {
    credentials(tx: Pool | ClientBase | DataLoaderExecutor): Promise<OpenIdCredential[]>;
    credential(tx: Pool | ClientBase | DataLoaderExecutor, authorityUserId: string): Promise<null | OpenIdCredential>;
    emailAuthority(tx: DataLoaderExecutor): Promise<null | EmailAuthority>;
    assignsCreatedUsersToRoles(tx: DataLoaderExecutor): Promise<Role[]>;
}
