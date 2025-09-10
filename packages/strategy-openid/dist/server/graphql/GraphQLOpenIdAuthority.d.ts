import { GraphQLObjectType } from "graphql";
import { Context } from "@authx/authx";
import { OpenIdAuthority } from "../model/index.js";
export declare function filter<T>(iter: Iterable<T>, callback: (item: T, index: number) => boolean | Promise<boolean>): Promise<T[]>;
export declare const GraphQLOpenIdAuthority: GraphQLObjectType<OpenIdAuthority, Context>;
