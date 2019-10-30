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
import { GraphQLScope } from "./GraphQLScope";

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
            (await authorization.isAccessibleBy(realm, a, tx, "r...r."))
            ? authorization.secret
            : null;
        } finally {
          tx.release();
        }
      }
    },
    scopes: {
      type: new GraphQLList(GraphQLScope),
      async resolve(
        authorization,
        args,
        { realm, authorization: a, pool }: Context
      ): Promise<null | string[]> {
        const tx = await pool.connect();
        try {
          return a &&
            (await authorization.isAccessibleBy(realm, a, tx, "r..r.."))
            ? authorization.scopes
            : null;
        } finally {
          tx.release();
        }
      }
    },
    access: {
      type: new GraphQLList(GraphQLScope),
      async resolve(
        authorization,
        args,
        { realm, authorization: a, pool }: Context
      ): Promise<null | string[]> {
        if (!a) return null;
        const tx = await pool.connect();
        try {
          /* eslint-disable @typescript-eslint/camelcase */
          const values: { [name: string]: null | string } = {
            current_authorization_id: a.id,
            current_user_id: a.userId,
            ...(a.grantId ? { current_grant_id: a.grantId } : null)
          };
          /* eslint-enable @typescript-eslint/camelcase */

          return (await authorization.isAccessibleBy(realm, a, tx, "r..r.."))
            ? authorization.access(tx, values)
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
            !(await authorization.isAccessibleBy(realm, a, tx, "r..r..")) ||
            !(await authorization.isAccessibleBy(realm, a, tx, "r...r."))
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
            /* eslint-disable @typescript-eslint/camelcase */
            const values: { [name: string]: null | string } = {
              current_authorization_id: a.id,
              current_user_id: a.userId,
              ...(a.grantId ? { current_grant_id: a.grantId } : null)
            };
            /* eslint-enable @typescript-eslint/camelcase */
            return `Bearer ${jwt.sign(
              {
                aid: authorization.id,
                scopes: await authorization.access(tx, values)
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
