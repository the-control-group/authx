import {
  GraphQLID,
  GraphQLList,
  GraphQLNonNull,
  GraphQLString,
  GraphQLObjectType
} from "graphql";

import { Token, User } from "../models";
import { Context } from "./Context";
import { GraphQLUser } from "./GraphQLUser";

export const GraphQLToken = new GraphQLObjectType<Token, Context>({
  name: "Token",
  interfaces: () => [],
  fields: () => ({
    id: { type: new GraphQLNonNull(GraphQLID) },
    name: { type: GraphQLString },
    user: {
      type: new GraphQLList(GraphQLUser),
      async resolve(
        token,
        args,
        { realm, token: t, tx }: Context
      ): Promise<null | User> {
        if (!t) return null;
        const user = await token.user(tx);
        return user.isAccessibleBy(realm, t, tx) ? user : null;
      }
    },
    secret: {
      type: GraphQLString,
      async resolve(
        token,
        args,
        { realm, token: t, tx }: Context
      ): Promise<null | string> {
        return t && (await token.isAccessibleBy(realm, t, tx, "read.secrets"))
          ? token.secret
          : null;
      }
    },
    scopes: {
      type: new GraphQLList(GraphQLString),
      async resolve(
        token,
        args,
        { realm, token: t, tx }: Context
      ): Promise<null | string[]> {
        return t && (await token.isAccessibleBy(realm, t, tx, "read.scopes"))
          ? token.scopes
          : null;
      }
    }
  })
});
