// @flow

import { GraphQLObjectType, GraphQLString } from "graphql";
import { GraphQLCredential } from "./GraphQLCredential";

export const GraphQLCredentialEdge = new GraphQLObjectType({
  name: "CredentialEdge",
  interfaces: () => [],
  fields: () => ({
    cursor: { type: GraphQLString },
    node: { type: GraphQLCredential }
  })
});
