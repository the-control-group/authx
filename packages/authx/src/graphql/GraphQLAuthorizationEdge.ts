import { GraphQLObjectType, GraphQLString, GraphQLNonNull } from "graphql";
import { GraphQLAuthorization } from "./GraphQLAuthorization";
import { GraphQLEdge } from "./GraphQLEdge";

export const GraphQLAuthorizationEdge = new GraphQLObjectType({
	name: "AuthorizationEdge",
	interfaces: () => [GraphQLEdge],
	fields: () => ({
		cursor: { type: new GraphQLNonNull(GraphQLString) },
		node: { type: GraphQLAuthorization }
	})
});
