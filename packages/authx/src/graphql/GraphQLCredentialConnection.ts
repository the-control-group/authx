import { GraphQLList, GraphQLNonNull, GraphQLObjectType } from "graphql";
import { GraphQLPageInfo } from "./GraphQLPageInfo";
import { GraphQLCredentialEdge } from "./GraphQLCredentialEdge";
import { GraphQLConnection } from "./GraphQLConnection";

export const GraphQLCredentialConnection = new GraphQLObjectType({
	name: "CredentialConnection",
	interfaces: () => [GraphQLConnection],
	fields: () => ({
		pageInfo: { type: new GraphQLNonNull(GraphQLPageInfo) },
		edges: { type: new GraphQLList(GraphQLCredentialEdge) }
	})
});
