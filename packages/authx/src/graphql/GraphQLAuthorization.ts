import {
  GraphQLID,
  GraphQLList,
  GraphQLNonNull,
  GraphQLString,
  GraphQLBoolean,
  GraphQLObjectType
} from "graphql";

import jwt from "jsonwebtoken";
import v4 from "uuid/v4";
import { Grant, Authorization, User } from "../model";
import { Context } from "../Context";
import { GraphQLExplanation } from "./GraphQLExplanation";
import { GraphQLGrant } from "./GraphQLGrant";
import { GraphQLUser } from "./GraphQLUser";
import { GraphQLTokenFormat } from "./GraphQLTokenFormat";
import { GraphQLScope } from "./GraphQLScope";
import { Explanation, match } from "../util/explanations";
import { GraphQLNode } from "./GraphQLNode";

export const GraphQLAuthorization: GraphQLObjectType<
  Authorization,
  Context
> = new GraphQLObjectType<Authorization, Context>({
  name: "Authorization",
  interfaces: () => [GraphQLNode],
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
            (await authorization.isAccessibleBy(realm, a, tx, {
              basic: "r",
              scopes: "",
              secrets: "r"
            }))
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
            (await authorization.isAccessibleBy(realm, a, tx, {
              basic: "r",
              scopes: "r",
              secrets: ""
            }))
            ? authorization.scopes
            : null;
        } finally {
          tx.release();
        }
      }
    },
    explanations: {
      type: new GraphQLList(GraphQLExplanation),
      async resolve(
        authorization,
        args,
        { realm, authorization: a, pool, explanations }: Context
      ): Promise<null | Explanation[]> {
        const tx = await pool.connect();
        try {
          if (
            !a ||
            !(await authorization.isAccessibleBy(realm, a, tx, {
              basic: "r",
              scopes: "r",
              secrets: ""
            }))
          ) {
            return null;
          }
          const grant = await authorization.grant(tx);
          return match(explanations, authorization.scopes, {
            currentAuthorizationId: authorization.id,
            currentGrantId: authorization.grantId,
            currentUserId: authorization.userId,
            currentClientId: (grant && grant.clientId) || null
          });
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
          const values = {
            currentAuthorizationId: a.id,
            currentUserId: a.userId,
            currentGrantId: a.grantId ?? null,
            currentClientId: (await a.grant(tx))?.clientId ?? null
          };

          return (await authorization.isAccessibleBy(realm, a, tx, {
            basic: "r",
            scopes: "r",
            secrets: ""
          }))
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
            !(await authorization.isAccessibleBy(realm, a, tx, {
              basic: "r",
              scopes: "r",
              secrets: ""
            })) ||
            !(await authorization.isAccessibleBy(realm, a, tx, {
              basic: "r",
              scopes: "",
              secrets: "r"
            }))
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
            const values = {
              currentAuthorizationId: a.id,
              currentUserId: a.userId,
              currentGrantId: a.grantId ?? null,
              currentClientId: (await a.grant(tx))?.clientId ?? null
            };

            const tokenId = v4();
            await authorization.invoke(tx, {
              id: tokenId,
              format: "bearer",
              createdAt: new Date()
            });

            return `Bearer ${jwt.sign(
              {
                aid: authorization.id,
                scopes: await authorization.access(tx, values)
              },
              privateKey,
              {
                jwtid: tokenId,
                algorithm: "RS512",
                expiresIn: jwtValidityDuration,
                subject: authorization.userId,
                issuer: realm,

                // The jwt library uses the presence of keys in its validation,
                // so we cannot just set `audience` to undefined.
                ...(grant ? { audience: grant.clientId } : {})
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
