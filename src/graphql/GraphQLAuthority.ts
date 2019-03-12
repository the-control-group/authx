import {
  GraphQLID,
  GraphQLNonNull,
  GraphQLString,
  GraphQLInterfaceType
} from "graphql";

export const GraphQLAuthority = new GraphQLInterfaceType({
  name: "Authority",
  fields: () => ({
    id: { type: new GraphQLNonNull(GraphQLID) },
    strategy: { type: GraphQLString },
    name: { type: GraphQLString }
  })
});
