import { GraphQLObjectType, GraphQLString } from "graphql";
import { GraphQLUser } from "./GraphQLUser";

export const GraphQLUserEdge = new GraphQLObjectType({
  name: "UserEdge",
  fields: () => ({
    cursor: { type: GraphQLString },
    node: { type: GraphQLUser }
  })
});
