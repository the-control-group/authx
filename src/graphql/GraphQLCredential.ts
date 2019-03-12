import {
  GraphQLFloat,
  GraphQLID,
  GraphQLInt,
  GraphQLList,
  GraphQLNonNull,
  GraphQLString,
  GraphQLInterfaceType
} from "graphql";

import { GraphQLAuthority } from "./GraphQLAuthority";
import { GraphQLUser } from "./GraphQLUser";
import { GraphQLProfile } from "./GraphQLProfile";

export const GraphQLCredential = new GraphQLInterfaceType({
  name: "Credential",
  fields: () => ({
    id: { type: new GraphQLNonNull(GraphQLID) },
    user: { type: GraphQLUser },
    authority: { type: GraphQLAuthority },
    authorityUserId: { type: GraphQLString },
    profile: { type: GraphQLProfile }
  })
});
