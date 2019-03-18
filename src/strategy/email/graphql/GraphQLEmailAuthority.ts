import {
  GraphQLID,
  GraphQLInt,
  GraphQLNonNull,
  GraphQLString,
  GraphQLObjectType
} from "graphql";

import { EmailAuthority, EmailAuthorityDetails } from "../model";
import { GraphQLAuthority } from "../../../graphql";
import { Context } from "../../../graphql/Context";

// Authority
// ---------

export const GraphQLEmailAuthorityDetails = new GraphQLObjectType({
  name: "EmailAuthorityDetails",
  fields: () => ({
    rounds: { type: GraphQLInt }
  })
});

export const GraphQLEmailAuthority = new GraphQLObjectType<
  EmailAuthority,
  Context
>({
  name: "EmailAuthority",
  interfaces: () => [GraphQLAuthority],
  isTypeOf: (value: any): boolean => value instanceof EmailAuthority,
  fields: () => ({
    id: { type: new GraphQLNonNull(GraphQLID) },
    strategy: { type: GraphQLString },
    name: { type: GraphQLString },
    details: {
      type: GraphQLEmailAuthorityDetails,
      async resolve(
        authority,
        args,
        { realm, token: t, tx }: Context
      ): Promise<null | EmailAuthorityDetails> {
        return t &&
          (await authority.isAccessibleBy(realm, t, tx, "read.details"))
          ? authority.details
          : null;
      }
    }
  })
});
