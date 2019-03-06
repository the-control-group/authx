import { GraphQLList, GraphQLNonNull, GraphQLObjectType } from "graphql";
import { GraphQLPageInfo } from "./GraphQLPageInfo";
import { GraphQLCredentialEdge } from "./GraphQLCredentialEdge";

export const GraphQLCredentialConnection = new GraphQLObjectType({
  name: "CredentialConnection",
  interfaces: () => [],
  fields: () => ({
    pageInfo: { type: new GraphQLNonNull(GraphQLPageInfo) },
    edges: { type: new GraphQLList(GraphQLCredentialEdge) }
  })
});
