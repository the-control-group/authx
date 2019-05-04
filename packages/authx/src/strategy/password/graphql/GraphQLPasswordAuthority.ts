import {
  GraphQLID,
  GraphQLInt,
  GraphQLNonNull,
  GraphQLString,
  GraphQLObjectType
} from "graphql";

import { PasswordAuthority } from "../model";
import { GraphQLAuthority } from "../../../graphql";
import { Context } from "../../../Context";

// Authority
// ---------

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
    rounds: {
      type: GraphQLInt,
      async resolve(
        authority,
        args,
        { realm, authorization: a, tx }: Context
      ): Promise<null | number> {
        return a && (await authority.isAccessibleBy(realm, a, tx, "read.*"))
          ? authority.details.rounds
          : null;
      }
    }
  })
});
