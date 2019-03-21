import {
  GraphQLID,
  GraphQLList,
  GraphQLNonNull,
  GraphQLString,
  GraphQLBoolean,
  GraphQLObjectType
} from "graphql";

import { Credential, Grant, Token, User } from "../model";
import { Context } from "./Context";
import { GraphQLCredential } from "./GraphQLCredential";
import { GraphQLGrant } from "./GraphQLGrant";
import { GraphQLUser } from "./GraphQLUser";

export const GraphQLToken = new GraphQLObjectType<Token, Context>({
  name: "Token",
  interfaces: () => [],
  fields: () => ({
    id: { type: new GraphQLNonNull(GraphQLID) },
    name: { type: GraphQLString },
    enabled: {
      type: GraphQLBoolean
    },
    grant: {
      type: GraphQLGrant,
      async resolve(
        token,
        args,
        { realm, token: t, tx }: Context
      ): Promise<null | Grant> {
        if (!t) return null;
        const grant = await token.grant(tx);
        return grant && grant.isAccessibleBy(realm, t, tx) ? grant : null;
      }
    },
    user: {
      type: GraphQLUser,
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
        console.log(t);

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
