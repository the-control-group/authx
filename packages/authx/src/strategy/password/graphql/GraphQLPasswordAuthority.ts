import {
  GraphQLID,
  GraphQLInt,
  GraphQLNonNull,
  GraphQLString,
  GraphQLObjectType
} from "graphql";

import { PasswordAuthority, PasswordAuthorityDetails } from "../model";
import { GraphQLAuthority } from "../../../graphql";
import { Context } from "../../../Context";

// Authority
// ---------

export const GraphQLPasswordAuthorityDetails = new GraphQLObjectType({
  name: "PasswordAuthorityDetails",
  fields: () => ({
    rounds: { type: GraphQLInt }
  })
});

export const GraphQLPasswordAuthority = new GraphQLObjectType<
  PasswordAuthority,
  Context
>({
  name: "PasswordAuthority",
  interfaces: () => [GraphQLAuthority],
  isTypeOf: (value: any): boolean => value instanceof PasswordAuthority,
  fields: () => ({
    id: { type: new GraphQLNonNull(GraphQLID) },
    strategy: { type: GraphQLString },
    name: { type: GraphQLString },
    details: {
      type: GraphQLPasswordAuthorityDetails,
      async resolve(
        authority,
        args,
        { realm, authorization: a, tx }: Context
      ): Promise<null | PasswordAuthorityDetails> {
        return a &&
          (await authority.isAccessibleBy(realm, a, tx, "read.details"))
          ? authority.details
          : null;
      }
    }
  })
});
