import { GraphQLFieldConfig } from "graphql";
import { Context } from "@authx/authx";
export declare const authenticateEmail: GraphQLFieldConfig<any, Context, {
    authorityId: string;
    email: string;
    proof: null | string;
}>;
