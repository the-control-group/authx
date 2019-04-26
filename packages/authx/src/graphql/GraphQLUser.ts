import {
  GraphQLID,
  GraphQLList,
  GraphQLNonNull,
  GraphQLObjectType
} from "graphql";

import { User, Grant } from "../model";
import { Context } from "../Context";
import { GraphQLContact } from "./GraphQLContact";
import { GraphQLCredential } from "./GraphQLCredential";
import { GraphQLRole } from "./GraphQLRole";
import { GraphQLUserType } from "./GraphQLUserType";
import { GraphQLGrant } from "./GraphQLGrant";
import { GraphQLClient } from "./GraphQLClient";
import { filter } from "../util/filter";

export const GraphQLUser: GraphQLObjectType<
  User,
  Context
> = new GraphQLObjectType({
  name: "User",
  interfaces: () => [],
  fields: () => ({
    id: { type: new GraphQLNonNull(GraphQLID) },
    type: { type: GraphQLUserType },
    contact: {
      type: GraphQLContact,
      description:
        "User information formatted according to the Portable Contact spec.",
      resolve: user => ({
        ...user.contact,
        id: user.id,
        connected: false
      })
    },
    credentials: {
      type: new GraphQLList(GraphQLCredential),
      description: "List all of the user's credentials.",
      async resolve(
        user,
        args,
        { realm, authorization: a, tx, strategies: { credentialMap } }: Context
      ) {
        return a
          ? filter(await user.credentials(tx, credentialMap), credential =>
              credential.isAccessibleBy(realm, a, tx)
            )
          : null;
      }
    },
    grants: {
      type: new GraphQLList(GraphQLGrant),
      description: "List all of the user's grants.",
      async resolve(
        user,
        args,
        { realm, authorization: a, tx }: Context
      ): Promise<null | Grant[]> {
        return a
          ? filter(await user.grants(tx), grant =>
              grant.isAccessibleBy(realm, a, tx)
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
      type: new GraphQLList(GraphQLRole),
      description: "List all roles to which the user is assigned.",
      async resolve(user, args, { realm, authorization: a, tx }: Context) {
        return a
          ? filter(
              await user.roles(tx),
              async role =>
                (await role.isAccessibleBy(realm, a, tx)) &&
                (await role.isAccessibleBy(realm, a, tx, "read.assignments"))
            )
          : null;
      }
    },
    clients: {
      type: new GraphQLList(GraphQLClient),
      description: "List all roles to which the user is assigned.",
      async resolve(user, args, { realm, authorization: a, tx }: Context) {
        return a
          ? filter(await user.clients(tx), client =>
              client.isAccessibleBy(realm, a, tx)
            )
          : null;
      }
    }
  })
});
