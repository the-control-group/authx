import { Authority, Credential } from "./model";
import { GraphQLNamedType, GraphQLFieldConfig } from "graphql";
import { Context } from "./Context";
import { Context as KoaContext, Next as KoaNext } from "koa";

export interface Strategy {
	name: string;
	types: GraphQLNamedType[];
	queryFields: { [field: string]: GraphQLFieldConfig<any, Context, any> };
	mutationFields: { [field: string]: GraphQLFieldConfig<any, Context, any> };
	authorityModel: { new (data: any): Authority<any> };
	credentialModel: { new (data: any): Credential<any> };
	middleware: null | ((ctx: KoaContext, next: KoaNext) => Promise<void> | void);
}
