import { GraphQLString, GraphQLNonNull, GraphQLInterfaceType } from "graphql";
import { GraphQLNode } from "./GraphQLNode";

export const GraphQLEdge = new GraphQLInterfaceType({
	name: "Edge",
	fields: () => ({
		cursor: { type: new GraphQLNonNull(GraphQLString) },
		node: { type: GraphQLNode }
	})
});
