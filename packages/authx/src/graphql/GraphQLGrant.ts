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
import { GraphQLAuthorization } from "./GraphQLAuthorization";
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
        { realm, authorization: a, tx }: Context
      ): Promise<null | User> {
        if (!a) return null;
        const user = await grant.user(tx);
        return user.isAccessibleBy(realm, a, tx) ? user : null;
      }
    },
    client: {
      type: GraphQLClient,
      async resolve(
        grant,
        args,
        { realm, authorization: a, tx }: Context
      ): Promise<null | Client> {
        if (!a) return null;
        const client = await grant.client(tx);
        return client.isAccessibleBy(realm, a, tx) ? client : null;
      }
    },
    secrets: {
      type: new GraphQLList(GraphQLString),
      async resolve(
        grant,
        args,
        { realm, authorization: a, tx }: Context
      ): Promise<null | string[]> {
        return a && (await grant.isAccessibleBy(realm, a, tx, "read.secrets"))
          ? [...grant.secrets]
          : null;
      }
    },
    codes: {
      type: new GraphQLList(GraphQLString),
      async resolve(
        grant,
        args,
        { realm, authorization: a, tx }: Context
      ): Promise<null | string[]> {
        return a && (await grant.isAccessibleBy(realm, a, tx, "read.secrets"))
          ? [...grant.codes]
          : null;
      }
    },
    scopes: {
      type: new GraphQLList(GraphQLString),
      async resolve(
        grant,
        args,
        { realm, authorization: q, tx }: Context
      ): Promise<null | string[]> {
        return q && (await grant.isAccessibleBy(realm, q, tx, "read.scopes"))
          ? grant.scopes
          : null;
      }
    },
    authorizations: {
      type: new GraphQLList(GraphQLAuthorization),
      async resolve(grant, args, { realm, authorization: a, tx }: Context) {
        return a
          ? filter(await grant.authorizations(tx), authorization =>
              authorization.isAccessibleBy(realm, a, tx)
            )
          : [];
      }
    }
  })
});
