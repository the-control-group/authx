import {
  GraphQLID,
  GraphQLNonNull,
  GraphQLString,
  GraphQLInterfaceType
} from "graphql";

import { GraphQLAuthority } from "./GraphQLAuthority";
import { GraphQLUser } from "./GraphQLUser";
import { GraphQLContact } from "./GraphQLContact";

export const GraphQLCredential = new GraphQLInterfaceType({
  name: "Credential",
  fields: () => ({
    id: { type: new GraphQLNonNull(GraphQLID) },
    user: { type: GraphQLUser },
    authority: { type: GraphQLAuthority },
    authorityUserId: { type: GraphQLString },
    contact: { type: GraphQLContact }
  })
});
