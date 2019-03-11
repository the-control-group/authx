import {
  GraphQLFloat,
  GraphQLID,
  GraphQLInt,
  GraphQLList,
  GraphQLNonNull,
  GraphQLString,
  GraphQLInterfaceType
} from "graphql";

import GraphQLJSON from "graphql-type-json";
import { GraphQLAuthority } from "./GraphQLAuthority";
import { GraphQLUser } from "./GraphQLUser";

export const GraphQLCredential = new GraphQLInterfaceType({
  name: "Credential",
  fields: () => ({
    id: { type: new GraphQLNonNull(GraphQLID) },
    user: { type: GraphQLUser },
    authority: { type: GraphQLAuthority },
    authorityUserId: { type: GraphQLString },
    details: { type: GraphQLJSON },
    profile: { type: GraphQLJSON }
  })
});
