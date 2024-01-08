import { GraphQLList, GraphQLNonNull, GraphQLObjectType } from "graphql";
import { GraphQLPageInfo } from "./GraphQLPageInfo.js";
import { GraphQLAuthorityEdge } from "./GraphQLAuthorityEdge.js";
import { GraphQLConnection } from "./GraphQLConnection.js";

export const GraphQLAuthorityConnection = new GraphQLObjectType({
  name: "AuthorityConnection",
  interfaces: () => [GraphQLConnection],
  fields: () => ({
    pageInfo: { type: new GraphQLNonNull(GraphQLPageInfo) },
    edges: { type: new GraphQLList(GraphQLAuthorityEdge) },
  }),
});
