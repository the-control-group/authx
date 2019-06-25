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
        { realm, authorization: a, pool }: Context
      ): Promise<null | Grant> {
        if (!a) return null;
        const tx = await pool.connect();
        try {
          const grant = await authorization.grant(tx);
          return grant && grant.isAccessibleBy(realm, a, tx) ? grant : null;
        } finally {
          tx.release();
        }
      }
    },
    user: {
      type: GraphQLUser,
      async resolve(
        authorization,
        args,
        { realm, authorization: a, pool }: Context
      ): Promise<null | User> {
        if (!a) return null;
        const tx = await pool.connect();
        try {
          const user = await authorization.user(tx);
          return user.isAccessibleBy(realm, a, tx) ? user : null;
        } finally {
          tx.release();
        }
      }
    },
    secret: {
      type: GraphQLString,
      async resolve(
        authorization,
        args,
        { realm, authorization: a, pool }: Context
      ): Promise<null | string> {
        const tx = await pool.connect();
        try {
          return a &&
            (await authorization.isAccessibleBy(realm, a, tx, "read.secrets"))
            ? authorization.secret
            : null;
        } finally {
          tx.release();
        }
      }
    },
    scopes: {
      type: new GraphQLList(GraphQLString),
      async resolve(
        authorization,
        args,
        { realm, authorization: a, pool }: Context
      ): Promise<null | string[]> {
        const tx = await pool.connect();
        try {
          return a &&
            (await authorization.isAccessibleBy(realm, a, tx, "read.scopes"))
            ? authorization.scopes
            : null;
        } finally {
          tx.release();
        }
      }
    }
  })
});
