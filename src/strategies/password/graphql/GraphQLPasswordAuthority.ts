import bcrypt from "bcrypt";
import {
  GraphQLID,
  GraphQLInt,
  GraphQLNonNull,
  GraphQLString,
  GraphQLObjectType,
  GraphQLInputObjectType
} from "graphql";

import {
  PasswordAuthority,
  PasswordAuthorityDetails,
  PasswordCredential,
  PasswordCredentialDetails
} from "../models";
import { User } from "../../../models";
import {
  GraphQLAuthority,
  GraphQLCredential,
  GraphQLUser,
  GraphQLContact
} from "../../../graphql";
import { Context } from "../../../graphql/Context";

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
        { realm, token: t, tx }: Context
      ): Promise<null | PasswordAuthorityDetails> {
        return t &&
          (await authority.isAccessibleBy(realm, t, tx, "read.details"))
          ? authority.details
          : null;
      }
    }
  })
});
