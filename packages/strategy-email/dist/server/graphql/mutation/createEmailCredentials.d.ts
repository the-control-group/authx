import { GraphQLFieldConfig } from "graphql";
import { Context } from "@authx/authx";
export declare const createEmailCredentials: GraphQLFieldConfig<any, Context, {
    credentials: {
        id: null | string;
        enabled: boolean;
        userId: string;
        authorityId: string;
        email: string;
        proof: null | string;
        administration: {
            roleId: string;
            scopes: string[];
        }[];
    }[];
}>;
