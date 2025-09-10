import { GraphQLFieldConfig } from "graphql";
import { Context } from "@authx/authx";
export declare const updateOpenIdAuthorities: GraphQLFieldConfig<any, Context, {
    authorities: {
        id: string;
        enabled: null | boolean;
        name: null | string;
        description: null | string;
        authUrl: null | string;
        tokenUrl: null | string;
        clientId: null | string;
        clientSecret: null | string;
        restrictsAccountsToHostedDomains: null | string[];
        emailAuthorityId: null | string;
        matchesUsersByEmail: null | boolean;
        createsUnmatchedUsers: null | boolean;
        assignsCreatedUsersToRoleIds: null | string[];
    }[];
}>;
