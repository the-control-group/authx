import { GraphQLID, GraphQLNonNull, GraphQLInterfaceType } from "graphql";

export const GraphQLNode = new GraphQLInterfaceType({
  name: "Node",
  fields: () => ({
    id: { type: new GraphQLNonNull(GraphQLID) },
  }),
});
