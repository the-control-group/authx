import { GraphQLFieldConfig } from "graphql";
import { Context } from "@authx/authx";
export declare const updateEmailAuthorities: GraphQLFieldConfig<any, Context, {
    authorities: {
        id: string;
        enabled: null | boolean;
        name: null | string;
        description: null | string;
        privateKey: null | string;
        addPublicKeys: null | string[];
        removePublicKeys: null | string[];
        proofValidityDuration: null | number;
        authenticationEmailSubject: null | string;
        authenticationEmailText: null | string;
        authenticationEmailHtml: null | string;
        verificationEmailSubject: null | string;
        verificationEmailText: null | string;
        verificationEmailHtml: null | string;
    }[];
}>;
