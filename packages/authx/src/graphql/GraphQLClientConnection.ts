import { GraphQLList, GraphQLNonNull, GraphQLObjectType } from "graphql";
import { GraphQLPageInfo } from "./GraphQLPageInfo";
import { GraphQLClientEdge } from "./GraphQLClientEdge";
import { GraphQLConnection } from "./GraphQLConnection";

export const GraphQLClientConnection = new GraphQLObjectType({
	name: "ClientConnection",
	interfaces: () => [GraphQLConnection],
	fields: () => ({
		pageInfo: { type: new GraphQLNonNull(GraphQLPageInfo) },
		edges: { type: new GraphQLList(GraphQLClientEdge) }
	})
});
