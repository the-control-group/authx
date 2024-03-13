import { GraphQLObjectType, GraphQLString, GraphQLNonNull } from "graphql";
import { GraphQLCredential } from "./GraphQLCredential.js";
import { GraphQLEdge } from "./GraphQLEdge.js";

export const GraphQLCredentialEdge = new GraphQLObjectType({
  name: "CredentialEdge",
  interfaces: () => [GraphQLEdge],
  fields: () => ({
    cursor: { type: new GraphQLNonNull(GraphQLString) },
    node: { type: GraphQLCredential },
  }),
});
