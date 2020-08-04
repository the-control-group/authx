import {
  GraphQLID,
  GraphQLList,
  GraphQLNonNull,
  GraphQLString,
  GraphQLBoolean,
  GraphQLObjectType,
  GraphQLFieldConfigMap,
} from "graphql";

import {
  connectionFromArray,
  connectionArgs,
  ConnectionArguments,
} from "graphql-relay";

import { Grant, Client, User } from "../model";
import { Context } from "../Context";
import { GraphQLClient } from "./GraphQLClient";
import { GraphQLUser } from "./GraphQLUser";
import { GraphQLAuthorizationConnection } from "./GraphQLAuthorizationConnection";
import { GraphQLExplanation } from "./GraphQLExplanation";
import { GraphQLScope } from "./GraphQLScope";
import { GraphQLNode } from "./GraphQLNode";
import { filter } from "../util/filter";
import { Explanation, match } from "../util/explanations";

export const GraphQLGrant: GraphQLObjectType<
  Grant,
  Context
> = new GraphQLObjectType<Grant, Context>({
  name: "Grant",
  interfaces: () => [GraphQLNode],
  fields: (): GraphQLFieldConfigMap<Grant, Context> => ({
    id: { type: new GraphQLNonNull(GraphQLID) },
    enabled: {
      type: new GraphQLNonNull(GraphQLBoolean),
    },
    user: {
      type: GraphQLUser,
      async resolve(
        grant,
        args,
        { realm, authorization: a, executor }: Context
      ): Promise<null | User> {
        if (!a) return null;
        const user = await grant.user(executor);
        return user.isAccessibleBy(realm, a, executor) ? user : null;
      },
    },
    client: {
      type: GraphQLClient,
      async resolve(
        grant,
        args,
        { realm, authorization: a, executor }: Context
      ): Promise<null | Client> {
        if (!a) return null;
        const client = await grant.client(executor);
        return client.isAccessibleBy(realm, a, executor) ? client : null;
      },
    },
    secrets: {
      type: new GraphQLList(GraphQLString),
      async resolve(
        grant,
        args,
        { realm, authorization: a, executor }: Context
      ): Promise<null | string[]> {
        return a &&
          (await grant.isAccessibleBy(realm, a, executor, {
            basic: "r",
            scopes: "",
            secrets: "r",
          }))
          ? [...grant.secrets]
          : null;
      },
    },
    codes: {
      type: new GraphQLList(GraphQLString),
      async resolve(
        grant,
        args,
        { realm, authorization: a, executor }: Context
      ): Promise<null | string[]> {
        return a &&
          (await grant.isAccessibleBy(realm, a, executor, {
            basic: "r",
            scopes: "",
            secrets: "r",
          }))
          ? [...grant.codes]
          : null;
      },
    },
    scopes: {
      type: new GraphQLList(GraphQLScope),
      async resolve(
        grant,
        args,
        { realm, authorization: a, executor }: Context
      ): Promise<null | string[]> {
        return a &&
          (await grant.isAccessibleBy(realm, a, executor, {
            basic: "r",
            scopes: "r",
            secrets: "",
          }))
          ? grant.scopes
          : null;
      },
    },
    explanations: {
      type: new GraphQLList(GraphQLExplanation),
      description: "Fetch explanations of the grant's scopes.",
      async resolve(
        grant,
        args,
        { realm, authorization: a, executor, explanations }: Context
      ): Promise<null | Explanation[]> {
        if (
          !a ||
          !(await grant.isAccessibleBy(realm, a, executor, {
            basic: "r",
            scopes: "r",
            secrets: "",
          }))
        ) {
          return null;
        }
        return match(explanations, grant.scopes, {
          currentAuthorizationId: null,
          currentGrantId: grant.id,
          currentUserId: grant.userId,
          currentClientId: grant.clientId || null,
        });
      },
    },
    authorizations: {
      type: GraphQLAuthorizationConnection,

      // TODO: The type definitions in graphql-js are garbage, and will be
      // refactored shortly.
      args: connectionArgs as any,
      async resolve(
        grant,
        args: ConnectionArguments,
        { realm, authorization: a, executor }: Context
      ) {
        return a
          ? connectionFromArray(
              await filter(
                await grant.authorizations(executor),
                (authorization) =>
                  authorization.isAccessibleBy(realm, a, executor)
              ),
              args
            )
          : null;
      },
    },
  }),
});
