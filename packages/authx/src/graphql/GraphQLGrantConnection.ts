import { GraphQLList, GraphQLNonNull, GraphQLObjectType } from "graphql";
import { GraphQLPageInfo } from "./GraphQLPageInfo";
import { GraphQLGrantEdge } from "./GraphQLGrantEdge";
import { GraphQLConnection } from "./GraphQLConnection";

export const GraphQLGrantConnection = new GraphQLObjectType({
	name: "GrantConnection",
	interfaces: () => [GraphQLConnection],
	fields: () => ({
		pageInfo: { type: new GraphQLNonNull(GraphQLPageInfo) },
		edges: { type: new GraphQLList(GraphQLGrantEdge) }
	})
});
