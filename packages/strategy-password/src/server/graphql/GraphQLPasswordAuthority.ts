import {
  GraphQLID,
  GraphQLInt,
  GraphQLNonNull,
  GraphQLString,
  GraphQLBoolean,
  GraphQLObjectType,
} from "graphql";

import { PasswordAuthority } from "../model/index.js";
import { GraphQLAuthority, GraphQLNode, Context } from "@authx/authx";

// Authority
// ---------

export const GraphQLPasswordAuthority = new GraphQLObjectType<
  PasswordAuthority,
  Context
>({
  name: "PasswordAuthority",
  interfaces: () => [GraphQLNode, GraphQLAuthority],
  isTypeOf: (value: any): boolean => value instanceof PasswordAuthority,
  fields: () => ({
    id: { type: new GraphQLNonNull(GraphQLID) },
    enabled: {
      type: new GraphQLNonNull(GraphQLBoolean),
    },
    name: { type: GraphQLString },
    description: { type: GraphQLString },
    rounds: {
      type: GraphQLInt,
      async resolve(
        authority,
        args,
        { realm, authorization: a, executor }: Context,
      ): Promise<null | number> {
        return a &&
          (await authority.isAccessibleBy(realm, a, executor, {
            basic: "r",
            details: "r",
          }))
          ? authority.details.rounds
          : null;
      },
    },
  }),
});
