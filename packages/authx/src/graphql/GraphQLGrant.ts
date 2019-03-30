import {
  GraphQLID,
  GraphQLList,
  GraphQLNonNull,
  GraphQLString,
  GraphQLObjectType
} from "graphql";

import { Grant, Client, User } from "../model";
import { Context } from "../Context";
import { GraphQLClient } from "./GraphQLClient";
import { GraphQLUser } from "./GraphQLUser";
import { GraphQLToken } from "./GraphQLToken";
import { filter } from "../util/filter";

export const GraphQLGrant: GraphQLObjectType<
  Grant,
  Context
> = new GraphQLObjectType<Grant, Context>({
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
    secrets: {
      type: new GraphQLList(GraphQLString),
      async resolve(
        grant,
        args,
        { realm, token: t, tx }: Context
      ): Promise<null | string[]> {
        return t && (await grant.isAccessibleBy(realm, t, tx, "read.secrets"))
          ? [...grant.secrets]
          : null;
      }
    },
    codes: {
      type: new GraphQLList(GraphQLString),
      async resolve(
        grant,
        args,
        { realm, token: t, tx }: Context
      ): Promise<null | string[]> {
        return t && (await grant.isAccessibleBy(realm, t, tx, "read.secrets"))
          ? [...grant.codes]
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
    },
    tokens: {
      type: new GraphQLList(GraphQLToken),
      async resolve(grant, args, { realm, token: t, tx }: Context) {
        return t
          ? filter(await grant.tokens(tx), token =>
              token.isAccessibleBy(realm, t, tx)
            )
          : [];
      }
    }
  })
});
