import {
  GraphQLID,
  GraphQLList,
  GraphQLNonNull,
  GraphQLString,
  GraphQLBoolean,
  GraphQLObjectType,
} from "graphql";

import jwt from "jsonwebtoken";
import { v4 } from "uuid";
import { Grant, Authorization, User } from "../model";
import { Context } from "../Context";
import { GraphQLExplanation } from "./GraphQLExplanation";
import { GraphQLGrant } from "./GraphQLGrant";
import { GraphQLUser } from "./GraphQLUser";
import { GraphQLTokenFormat } from "./GraphQLTokenFormat";
import { GraphQLScope } from "./GraphQLScope";
import { Explanation, match } from "../util/explanations";
import { GraphQLNode } from "./GraphQLNode";

export const GraphQLAuthorization: GraphQLObjectType<Authorization, Context> =
  new GraphQLObjectType<Authorization, Context>({
    name: "Authorization",
    interfaces: () => [GraphQLNode],
    fields: () => ({
      id: { type: new GraphQLNonNull(GraphQLID) },
      enabled: {
        type: new GraphQLNonNull(GraphQLBoolean),
      },
      grant: {
        type: GraphQLGrant,
        async resolve(
          authorization,
          args,
          { realm, authorization: a, executor }: Context
        ): Promise<null | Grant> {
          if (!a) return null;
          const grant = await authorization.grant(executor);
          return grant && (await grant.isAccessibleBy(realm, a, executor))
            ? grant
            : null;
        },
      },
      user: {
        type: GraphQLUser,
        async resolve(
          authorization,
          args,
          { realm, authorization: a, executor }: Context
        ): Promise<null | User> {
          if (!a) return null;

          const user = await authorization.user(executor);
          return (await user.isAccessibleBy(realm, a, executor)) ? user : null;
        },
      },
      secret: {
        type: GraphQLString,
        async resolve(
          authorization,
          args,
          { realm, authorization: a, executor }: Context
        ): Promise<null | string> {
          return a &&
            (await authorization.isAccessibleBy(realm, a, executor, {
              basic: "r",
              scopes: "",
              secrets: "r",
            }))
            ? authorization.secret
            : null;
        },
      },
      scopes: {
        type: new GraphQLList(GraphQLScope),
        async resolve(
          authorization,
          args,
          { realm, authorization: a, executor }: Context
        ): Promise<null | string[]> {
          return a &&
            (await authorization.isAccessibleBy(realm, a, executor, {
              basic: "r",
              scopes: "r",
              secrets: "",
            }))
            ? authorization.scopes
            : null;
        },
      },
      explanations: {
        type: new GraphQLList(GraphQLExplanation),
        async resolve(
          authorization,
          args,
          { realm, authorization: a, executor, explanations }: Context
        ): Promise<null | Explanation[]> {
          if (
            !a ||
            !(await authorization.isAccessibleBy(realm, a, executor, {
              basic: "r",
              scopes: "r",
              secrets: "",
            }))
          ) {
            return null;
          }
          const grant = await authorization.grant(executor);
          return match(explanations, authorization.scopes, {
            currentAuthorizationId: authorization.id,
            currentGrantId: authorization.grantId,
            currentUserId: authorization.userId,
            currentClientId: (grant && grant.clientId) || null,
          });
        },
      },
      access: {
        type: new GraphQLList(GraphQLScope),
        async resolve(
          authorization,
          args,
          { realm, authorization: a, executor }: Context
        ): Promise<null | string[]> {
          if (!a) return null;
          return (await authorization.isAccessibleBy(realm, a, executor, {
            basic: "r",
            scopes: "r",
            secrets: "",
          }))
            ? authorization.access(executor, realm)
            : null;
        },
      },
      token: {
        type: GraphQLString,
        args: {
          format: {
            type: new GraphQLNonNull(GraphQLTokenFormat),
          },
        },
        async resolve(
          authorization,
          args,
          {
            realm,
            jwtValidityDuration,
            privateKey,
            authorization: a,
            executor,
            rateLimiter,
          }: Context
        ): Promise<null | string> {
          if (!a) return null;
          if (
            !(await authorization.isAccessibleBy(realm, a, executor, {
              basic: "r",
              scopes: "r",
              secrets: "",
            })) ||
            !(await authorization.isAccessibleBy(realm, a, executor, {
              basic: "r",
              scopes: "",
              secrets: "r",
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
            rateLimiter.limit(authorization.id);

            const tokenId = v4();
            const grant = await authorization.grant(executor);
            await authorization.invoke(executor, {
              id: tokenId,
              format: "bearer",
              createdAt: new Date(),
            });

            return `Bearer ${jwt.sign(
              {
                aid: authorization.id,
                scopes: await authorization.access(executor, realm),
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
                ...(grant ? { audience: grant.clientId } : {}),
              }
            )}`;
          }

          throw new Error("INVARIANT: Impossible token format.");
        },
      },
    }),
  });
