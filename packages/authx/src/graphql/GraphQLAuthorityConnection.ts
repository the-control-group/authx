import { GraphQLList, GraphQLNonNull, GraphQLObjectType } from "graphql";
import { GraphQLPageInfo } from "./GraphQLPageInfo";
import { GraphQLAuthorityEdge } from "./GraphQLAuthorityEdge";
import { GraphQLConnection } from "./GraphQLConnection";

export const GraphQLAuthorityConnection = new GraphQLObjectType({
	name: "AuthorityConnection",
	interfaces: () => [GraphQLConnection],
	fields: () => ({
		pageInfo: { type: new GraphQLNonNull(GraphQLPageInfo) },
		edges: { type: new GraphQLList(GraphQLAuthorityEdge) }
	})
});
