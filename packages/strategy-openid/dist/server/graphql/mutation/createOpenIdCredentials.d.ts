import { GraphQLFieldConfig } from "graphql";
import { Context } from "@authx/authx";
export declare const createOpenIdCredentials: GraphQLFieldConfig<any, Context, {
    credentials: {
        id: null | string;
        enabled: boolean;
        userId: string;
        authorityId: string;
        code: null | string;
        subject: null | string;
        administration: {
            roleId: string;
            scopes: string[];
        }[];
    }[];
}>;
