import {
  GraphQLID,
  GraphQLList,
  GraphQLNonNull,
  GraphQLString,
  GraphQLBoolean,
  GraphQLObjectType
} from "graphql";

import jwt from "jsonwebtoken";
import { Grant, Authorization, User } from "../model";
import { Context } from "../Context";
import { GraphQLGrant } from "./GraphQLGrant";
import { GraphQLUser } from "./GraphQLUser";
import { GraphQLTokenFormat } from "./GraphQLTokenFormat";

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
    },
    access: {
      type: GraphQLString,
      async resolve(
        authorization,
        args,
        { realm, authorization: a, pool }: Context
      ): Promise<null | string[]> {
        const tx = await pool.connect();
        try {
          return a &&
            (await authorization.isAccessibleBy(realm, a, tx, "read.scopes"))
            ? authorization.access(tx)
            : null;
        } finally {
          tx.release();
        }
      }
    },
    token: {
      type: GraphQLString,
      args: {
        format: {
          type: new GraphQLNonNull(GraphQLTokenFormat)
        }
      },
      async resolve(
        authorization,
        args,
        {
          realm,
          jwtValidityDuration,
          privateKey,
          authorization: a,
          pool
        }: Context
      ): Promise<null | string> {
        const tx = await pool.connect();
        if (!a) return null;
        try {
          if (
            !(await authorization.isAccessibleBy(
              realm,
              a,
              tx,
              "read.scopes"
            )) ||
            !(await authorization.isAccessibleBy(realm, a, tx, "read.secrets"))
          ) {
            return null;
          }

          if (args.format === "basic") {
            return `Basic ${Buffer.from(
              `${authorization.id}:${authorization.secret}`,
              "utf8"
            ).toString("base64")}`;
          }

          if (args.format === "bearer") {
            const grant = await authorization.grant(tx);
            return `Bearer ${jwt.sign(
              {
                aid: authorization.id,
                scopes: await authorization.access(tx)
              },
              privateKey,
              {
                algorithm: "RS512",
                expiresIn: jwtValidityDuration,
                audience: (grant && grant.clientId) || undefined,
                subject: authorization.userId,
                issuer: realm
              }
            )}`;
          }

          throw new Error("INVARIANT: Impossible token format.");
        } finally {
          tx.release();
        }
      }
    }
  })
});
