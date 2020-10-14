import { GraphQLBoolean, GraphQLObjectType, GraphQLString } from "graphql";

export const GraphQLPageInfo = new GraphQLObjectType({
  name: "PageInfo",
  description:
    "See: https://facebook.github.io/relay/graphql/connections.htm#sec-undefined.PageInfo",
  fields: () => ({
    hasPreviousPage: { type: GraphQLBoolean },
    hasNextPage: { type: GraphQLBoolean },
    startCursor: { type: GraphQLString },
    endCursor: { type: GraphQLString },
  }),
});
