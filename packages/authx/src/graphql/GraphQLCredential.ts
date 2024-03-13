import {
  GraphQLID,
  GraphQLNonNull,
  GraphQLBoolean,
  GraphQLInterfaceType,
} from "graphql";

import { GraphQLAuthority } from "./GraphQLAuthority.js";
import { GraphQLUser } from "./GraphQLUser.js";
import { GraphQLNode } from "./GraphQLNode.js";

export const GraphQLCredential = new GraphQLInterfaceType({
  name: "Credential",
  interfaces: () => [GraphQLNode],
  fields: () => ({
    id: { type: new GraphQLNonNull(GraphQLID) },
    enabled: {
      type: new GraphQLNonNull(GraphQLBoolean),
    },
    user: { type: GraphQLUser },
    authority: { type: GraphQLAuthority },
  }),
});
