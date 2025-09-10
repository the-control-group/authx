import { GraphQLFieldConfig } from "graphql";
import { Context } from "@authx/authx";
export declare const updateEmailCredentials: GraphQLFieldConfig<any, Context, {
    credentials: {
        id: string;
        enabled: null | boolean;
    }[];
}>;
