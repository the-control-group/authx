import { GraphQLFieldConfig } from "graphql";
import { Context } from "@authx/authx";
export declare const createEmailAuthorities: GraphQLFieldConfig<any, Context, {
    authorities: {
        id: null | string;
        enabled: boolean;
        name: string;
        description: string;
        privateKey: string;
        publicKeys: string[];
        proofValidityDuration: number;
        authenticationEmailSubject: string;
        authenticationEmailText: string;
        authenticationEmailHtml: string;
        verificationEmailSubject: string;
        verificationEmailText: string;
        verificationEmailHtml: string;
        administration: {
            roleId: string;
            scopes: string[];
        }[];
    }[];
}>;
