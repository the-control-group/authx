import {
  GraphQLID,
  GraphQLList,
  GraphQLNonNull,
  GraphQLString,
  GraphQLBoolean,
  GraphQLObjectType
} from "graphql";

import { Grant, Authorization, User } from "../model";
import { Context } from "../Context";
import { GraphQLGrant } from "./GraphQLGrant";
import { GraphQLUser } from "./GraphQLUser";

export const GraphQLAuthorization: GraphQLObjectType<
  Authorization,
  Context
> = new GraphQLObjectType<Authorization, Context>({
  name: "Authorization",
  interfaces: () => [],
  fields: () => ({
    id: { type: new GraphQLNonNull(GraphQLID) },
    enabled: {
      type: new GraphQLNonNull(GraphQLBoolean)
    },
    grant: {
      type: GraphQLGrant,
      async resolve(
        authorization,
        args,
        { realm, authorization: a, tx }: Context
      ): Promise<null | Grant> {
        if (!a) return null;
        const grant = await authorization.grant(tx);
        return grant && grant.isAccessibleBy(realm, a, tx) ? grant : null;
      }
    },
    user: {
      type: GraphQLUser,
      async resolve(
        authorization,
        args,
        { realm, authorization: a, tx }: Context
      ): Promise<null | User> {
        if (!a) return null;
        const user = await authorization.user(tx);
        return user.isAccessibleBy(realm, a, tx) ? user : null;
      }
    },
    secret: {
      type: GraphQLString,
      async resolve(
        authorization,
        args,
        { realm, authorization: a, tx }: Context
      ): Promise<null | string> {
        return a &&
          (await authorization.isAccessibleBy(realm, a, tx, "read.secrets"))
          ? authorization.secret
          : null;
      }
    },
    scopes: {
      type: new GraphQLList(GraphQLString),
      async resolve(
        authorization,
        args,
        { realm, authorization: a, tx }: Context
      ): Promise<null | string[]> {
        return a &&
          (await authorization.isAccessibleBy(realm, a, tx, "read.scopes"))
          ? authorization.scopes
          : null;
      }
    }
  })
});
