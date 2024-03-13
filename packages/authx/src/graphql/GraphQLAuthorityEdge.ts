import { GraphQLObjectType, GraphQLString, GraphQLNonNull } from "graphql";
import { GraphQLAuthority } from "./GraphQLAuthority.js";
import { GraphQLEdge } from "./GraphQLEdge.js";

export const GraphQLAuthorityEdge = new GraphQLObjectType({
  name: "AuthorityEdge",
  interfaces: () => [GraphQLEdge],
  fields: () => ({
    cursor: { type: new GraphQLNonNull(GraphQLString) },
    node: { type: GraphQLAuthority },
  }),
});
