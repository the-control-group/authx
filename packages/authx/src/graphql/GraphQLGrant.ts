import {
  GraphQLID,
  GraphQLList,
  GraphQLNonNull,
  GraphQLString,
  GraphQLBoolean,
  GraphQLObjectType
} from "graphql";

import {
  connectionFromArray,
  connectionArgs,
  ConnectionArguments
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
  fields: () => ({
    id: { type: new GraphQLNonNull(GraphQLID) },
    enabled: {
      type: new GraphQLNonNull(GraphQLBoolean)
    },
    user: {
      type: GraphQLUser,
      async resolve(
        grant,
        args,
        { realm, authorization: a, pool }: Context
      ): Promise<null | User> {
        const tx = await pool.connect();
        try {
          if (!a) return null;
          const user = await grant.user(tx);
          return user.isAccessibleBy(realm, a, tx) ? user : null;
        } finally {
          tx.release();
        }
      }
    },
    client: {
      type: GraphQLClient,
      async resolve(
        grant,
        args,
        { realm, authorization: a, pool }: Context
      ): Promise<null | Client> {
        const tx = await pool.connect();
        try {
          if (!a) return null;
          const client = await grant.client(tx);
          return client.isAccessibleBy(realm, a, tx) ? client : null;
        } finally {
          tx.release();
        }
      }
    },
    secrets: {
      type: new GraphQLList(GraphQLString),
      async resolve(
        grant,
        args,
        { realm, authorization: a, pool }: Context
      ): Promise<null | string[]> {
        const tx = await pool.connect();
        try {
          return a &&
            (await grant.isAccessibleBy(realm, a, tx, {
              basic: "r",
              scopes: "",
              secrets: "r"
            }))
            ? [...grant.secrets]
            : null;
        } finally {
          tx.release();
        }
      }
    },
    codes: {
      type: new GraphQLList(GraphQLString),
      async resolve(
        grant,
        args,
        { realm, authorization: a, pool }: Context
      ): Promise<null | string[]> {
        const tx = await pool.connect();
        try {
          return a &&
            (await grant.isAccessibleBy(realm, a, tx, {
              basic: "r",
              scopes: "",
              secrets: "r"
            }))
            ? [...grant.codes]
            : null;
        } finally {
          tx.release();
        }
      }
    },
    scopes: {
      type: new GraphQLList(GraphQLScope),
      async resolve(
        grant,
        args,
        { realm, authorization: a, pool }: Context
      ): Promise<null | string[]> {
        const tx = await pool.connect();
        try {
          return a &&
            (await grant.isAccessibleBy(realm, a, tx, {
              basic: "r",
              scopes: "r",
              secrets: ""
            }))
            ? grant.scopes
            : null;
        } finally {
          tx.release();
        }
      }
    },
    explanations: {
      type: new GraphQLList(GraphQLExplanation),
      description: "Fetch explanations of the grant's scopes.",
      async resolve(
        grant,
        args,
        { realm, authorization: a, pool, explanations }: Context
      ): Promise<null | Explanation[]> {
        const tx = await pool.connect();
        try {
          if (
            !a ||
            !(await grant.isAccessibleBy(realm, a, tx, {
              basic: "r",
              scopes: "r",
              secrets: ""
            }))
          ) {
            return null;
          }
          return match(explanations, grant.scopes, {
            currentAuthorizationId: null,
            currentGrantId: grant.id,
            currentUserId: grant.userId,
            currentClientId: grant.clientId || null
          });
        } finally {
          tx.release();
        }
      }
    },
    authorizations: {
      type: GraphQLAuthorizationConnection,
      args: connectionArgs,
      async resolve(
        grant,
        args: ConnectionArguments,
        { realm, authorization: a, pool }: Context
      ) {
        const tx = await pool.connect();
        try {
          return a
            ? connectionFromArray(
                await filter(await grant.authorizations(tx), authorization =>
                  authorization.isAccessibleBy(realm, a, tx)
                ),
                args
              )
            : null;
        } finally {
          tx.release();
        }
      }
    }
  })
});
