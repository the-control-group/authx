import { GraphQLFieldConfig } from "graphql";
import { Context } from "@authx/authx";
export declare const authenticateOpenId: GraphQLFieldConfig<any, Context, {
    authorityId: string;
    code: string;
}>;
