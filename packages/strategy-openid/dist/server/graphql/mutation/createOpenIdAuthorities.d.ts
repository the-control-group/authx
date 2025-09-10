import { GraphQLFieldConfig } from "graphql";
import { Context } from "@authx/authx";
export declare const createOpenIdAuthorities: GraphQLFieldConfig<any, Context, {
    authorities: {
        id: null | string;
        enabled: boolean;
        name: string;
        description: string;
        authUrl: string;
        tokenUrl: string;
        clientId: string;
        clientSecret: string;
        restrictsAccountsToHostedDomains: string[];
        emailAuthorityId: null | string;
        matchesUsersByEmail: boolean;
        createsUnmatchedUsers: boolean;
        assignsCreatedUsersToRoleIds: string[];
        administration: {
            roleId: string;
            scopes: string[];
        }[];
    }[];
}>;
