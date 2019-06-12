import { GraphQLList, GraphQLNonNull, GraphQLObjectType } from "graphql";
import { GraphQLPageInfo } from "./GraphQLPageInfo";
import { GraphQLAuthorityEdge } from "./GraphQLAuthorityEdge";

export const GraphQLAuthorityConnection = new GraphQLObjectType({
  name: "AuthorityConnection",
  fields: () => ({
    pageInfo: { type: new GraphQLNonNull(GraphQLPageInfo) },
    edges: { type: new GraphQLList(GraphQLAuthorityEdge) }
  })
});
