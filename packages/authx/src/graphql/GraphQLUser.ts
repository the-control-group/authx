import {
  GraphQLID,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLBoolean,
  GraphQLString
} from "graphql";

import {
  connectionFromArray,
  connectionArgs,
  ConnectionArguments
} from "graphql-relay";

import { User, Grant } from "../model";
import { Context } from "../Context";
import { GraphQLRoleConnection } from "./GraphQLRoleConnection";
import { GraphQLUserType } from "./GraphQLUserType";
import { GraphQLGrant } from "./GraphQLGrant";
import { GraphQLGrantConnection } from "./GraphQLGrantConnection";
import { GraphQLClientConnection } from "./GraphQLClientConnection";
import { GraphQLAuthorizationConnection } from "./GraphQLAuthorizationConnection";
import { GraphQLCredentialConnection } from "./GraphQLCredentialConnection";
import { filter } from "../util/filter";

export const GraphQLUser: GraphQLObjectType<
  User,
  Context
> = new GraphQLObjectType({
  name: "User",
  interfaces: () => [],
  fields: () => ({
    id: { type: new GraphQLNonNull(GraphQLID) },
    enabled: {
      type: new GraphQLNonNull(GraphQLBoolean)
    },
    name: {
      type: GraphQLString
    },
    type: { type: GraphQLUserType },
    authorizations: {
      type: GraphQLAuthorizationConnection,
      description: "List all of the user's authorizations.",
      args: connectionArgs,
      async resolve(
        user,
        args: ConnectionArguments,
        { realm, authorization: a, tx }: Context
      ) {
        return a
          ? connectionFromArray(
              await filter(await user.authorizations(tx), authorization =>
                authorization.isAccessibleBy(realm, a, tx)
              ),
              args
            )
          : null;
      }
    },
    credentials: {
      type: GraphQLCredentialConnection,
      description: "List all of the user's credentials.",
      args: connectionArgs,
      async resolve(
        user,
        args: ConnectionArguments,
        { realm, authorization: a, tx, strategies: { credentialMap } }: Context
      ) {
        return a
          ? connectionFromArray(
              await filter(
                await user.credentials(tx, credentialMap),
                credential => credential.isAccessibleBy(realm, a, tx)
              ),
              args
            )
          : null;
      }
    },
    grants: {
      type: GraphQLGrantConnection,
      description: "List all of the user's grants.",
      args: connectionArgs,
      async resolve(user, args, { realm, authorization: a, tx }: Context) {
        return a
          ? connectionFromArray(
              await filter(await user.grants(tx), grant =>
                grant.isAccessibleBy(realm, a, tx)
              ),
              args
            )
          : null;
      }
    },
    grant: {
      type: GraphQLGrant,
      args: {
        clientId: {
          type: new GraphQLNonNull(GraphQLID),
          description: "A ID of the client."
        }
      },
      description: "Look for a grant between this user and a client.",
      async resolve(
        user,
        args,
        { realm, authorization: a, tx }: Context
      ): Promise<null | Grant> {
        if (!a) return null;
        const grant = await user.grant(tx, args.clientId);
        return grant && grant.isAccessibleBy(realm, a, tx) ? grant : null;
      }
    },
    roles: {
      type: GraphQLRoleConnection,
      description: "List all roles to which the user is assigned.",
      args: connectionArgs,
      async resolve(user, args, { realm, authorization: a, tx }: Context) {
        return a
          ? connectionFromArray(
              await filter(
                await user.roles(tx),
                async role =>
                  (await role.isAccessibleBy(realm, a, tx)) &&
                  (await role.isAccessibleBy(realm, a, tx, "read.assignments"))
              ),
              args
            )
          : null;
      }
    },
    clients: {
      type: GraphQLClientConnection,
      description: "List all roles to which the user is assigned.",
      args: connectionArgs,
      async resolve(user, args, { realm, authorization: a, tx }: Context) {
        return a
          ? connectionFromArray(
              await filter(await user.clients(tx), client =>
                client.isAccessibleBy(realm, a, tx)
              ),
              args
            )
          : null;
      }
    }
  })
});
