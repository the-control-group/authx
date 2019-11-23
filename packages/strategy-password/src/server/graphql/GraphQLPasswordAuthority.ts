import {
  GraphQLID,
  GraphQLInt,
  GraphQLNonNull,
  GraphQLString,
  GraphQLBoolean,
  GraphQLObjectType
} from "graphql";

import { PasswordAuthority } from "../model";
import { GraphQLAuthority, Context } from "@authx/authx";

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
    enabled: {
      type: new GraphQLNonNull(GraphQLBoolean)
    },
    name: { type: GraphQLString },
    description: { type: GraphQLString },
    rounds: {
      type: GraphQLInt,
      async resolve(
        authority,
        args,
        { realm, authorization: a, pool }: Context
      ): Promise<null | number> {
        const tx = await pool.connect();
        try {
          return a &&
            (await authority.isAccessibleBy(realm, a, tx, {
              basic: "r",
              details: "r"
            }))
            ? authority.details.rounds
            : null;
        } finally {
          tx.release();
        }
      }
    }
  })
});
