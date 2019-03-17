import {
  GraphQLID,
  GraphQLList,
  GraphQLNonNull,
  GraphQLString,
  GraphQLObjectType
} from "graphql";

import { Client } from "../models";
import { Context } from "./Context";
import { GraphQLUser } from "./GraphQLUser";
import { filter } from "../util/filter";

export const GraphQLClient = new GraphQLObjectType<Client, Context>({
  name: "Client",
  interfaces: () => [],
  fields: () => ({
    id: { type: new GraphQLNonNull(GraphQLID) },
    name: { type: GraphQLString },
    oauth2Secrets: {
      type: new GraphQLList(GraphQLString),
      async resolve(
        client,
        args,
        { realm, token: t, tx }: Context
      ): Promise<null | string[]> {
        return t && (await client.isAccessibleBy(realm, t, tx, "read.secrets"))
          ? [...client.oauth2Secrets]
          : null;
      }
    },
    oauth2Urls: { type: new GraphQLList(GraphQLString) },
    users: {
      type: new GraphQLList(GraphQLUser),
      async resolve(client, args, { realm, token: t, tx }: Context) {
        return t &&
          (await client.isAccessibleBy(realm, t, tx, "read.assignments"))
          ? filter(await client.users(tx), user =>
              user.isAccessibleBy(realm, t, tx)
            )
          : [];
      }
    }
  })
});
