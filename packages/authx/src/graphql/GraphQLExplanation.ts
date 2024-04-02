import { GraphQLObjectType, GraphQLString } from "graphql";

import { Context } from "../Context.js";
export const GraphQLExplanation: GraphQLObjectType<
  { scope: string; description: string },
  Context
> = new GraphQLObjectType({
  name: "Explanation",
  interfaces: () => [],
  fields: () => ({
    scope: {
      type: GraphQLString,
    },
    description: {
      type: GraphQLString,
    },
  }),
});
