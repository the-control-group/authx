import { GraphQLObjectType, GraphQLString, GraphQLNonNull } from "graphql";
import { GraphQLCredential } from "./GraphQLCredential";
import { GraphQLEdge } from "./GraphQLEdge";

export const GraphQLCredentialEdge = new GraphQLObjectType({
  name: "CredentialEdge",
  interfaces: () => [GraphQLEdge],
  fields: () => ({
    cursor: { type: new GraphQLNonNull(GraphQLString) },
    node: { type: GraphQLCredential }
  })
});
