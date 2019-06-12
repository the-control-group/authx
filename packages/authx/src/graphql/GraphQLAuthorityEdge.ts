import { GraphQLObjectType, GraphQLString } from "graphql";
import { GraphQLAuthority } from "./GraphQLAuthority";

export const GraphQLAuthorityEdge = new GraphQLObjectType({
  name: "AuthorityEdge",
  fields: () => ({
    cursor: { type: GraphQLString },
    node: { type: GraphQLAuthority }
  })
});
