import {
  GraphQLID,
  GraphQLList,
  GraphQLNonNull,
  GraphQLString,
  GraphQLObjectType
} from "graphql";

import { Grant, Client, User } from "../model";
import { Context } from "./Context";
import { GraphQLClient } from "./GraphQLClient";
import { GraphQLUser } from "./GraphQLUser";

export const GraphQLGrant = new GraphQLObjectType<Grant, Context>({
  name: "Grant",
  interfaces: () => [],
  fields: () => ({
    id: { type: new GraphQLNonNull(GraphQLID) },
    user: {
      type: GraphQLUser,
      async resolve(
        grant,
        args,
        { realm, token: t, tx }: Context
      ): Promise<null | User> {
        if (!t) return null;
        const user = await grant.user(tx);
        return user.isAccessibleBy(realm, t, tx) ? user : null;
      }
    },
    client: {
      type: GraphQLClient,
      async resolve(
        grant,
        args,
        { realm, token: t, tx }: Context
      ): Promise<null | Client> {
        if (!t) return null;
        const client = await grant.client(tx);
        return client.isAccessibleBy(realm, t, tx) ? client : null;
      }
    },
    oauth2Nonce: {
      type: GraphQLString,
      async resolve(
        grant,
        args,
        { realm, token: t, tx }: Context
      ): Promise<null | string> {
        return t && (await grant.isAccessibleBy(realm, t, tx, "read.secrets"))
          ? grant.oauth2Nonce
          : null;
      }
    },
    oauth2RefreshToken: {
      type: GraphQLString,
      async resolve(
        grant,
        args,
        { realm, token: t, tx }: Context
      ): Promise<null | string> {
        return t && (await grant.isAccessibleBy(realm, t, tx, "read.secrets"))
          ? grant.oauth2RefreshToken
          : null;
      }
    },
    scopes: {
      type: new GraphQLList(GraphQLString),
      async resolve(
        grant,
        args,
        { realm, token: t, tx }: Context
      ): Promise<null | string[]> {
        return t && (await grant.isAccessibleBy(realm, t, tx, "read.scopes"))
          ? grant.scopes
          : null;
      }
    }
  })
});
