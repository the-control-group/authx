import { GraphQLList, GraphQLNonNull, GraphQLObjectType } from "graphql";
import { GraphQLPageInfo } from "./GraphQLPageInfo.js";
import { GraphQLCredentialEdge } from "./GraphQLCredentialEdge.js";
import { GraphQLConnection } from "./GraphQLConnection.js";

export const GraphQLCredentialConnection = new GraphQLObjectType({
  name: "CredentialConnection",
  interfaces: () => [GraphQLConnection],
  fields: () => ({
    pageInfo: { type: new GraphQLNonNull(GraphQLPageInfo) },
    edges: { type: new GraphQLList(GraphQLCredentialEdge) },
  }),
});
