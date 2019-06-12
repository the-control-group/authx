import { GraphQLObjectType, GraphQLString } from "graphql";
import { GraphQLGrant } from "./GraphQLGrant";

export const GraphQLGrantEdge = new GraphQLObjectType({
  name: "GrantEdge",
  fields: () => ({
    cursor: { type: GraphQLString },
    node: { type: GraphQLGrant }
  })
});
