import {
  GraphQLID,
  GraphQLNonNull,
  GraphQLString,
  GraphQLBoolean,
  GraphQLInterfaceType,
} from "graphql";

import { GraphQLNode } from "./GraphQLNode";

export const GraphQLAuthority = new GraphQLInterfaceType({
  name: "Authority",
  interfaces: () => [GraphQLNode],
  fields: () => ({
    id: { type: new GraphQLNonNull(GraphQLID) },
    enabled: {
      type: new GraphQLNonNull(GraphQLBoolean),
    },
    name: { type: GraphQLString },
    description: { type: GraphQLString },
  }),
});
