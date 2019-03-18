import v4 from "uuid/v4";
import { randomBytes } from "crypto";
import {
  GraphQLBoolean,
  GraphQLFieldConfig,
  GraphQLList,
  GraphQLNonNull,
  GraphQLString
} from "graphql";

import { Context } from "../Context";
import { GraphQLClient } from "../GraphQLClient";
import { Client } from "../../models";
import { ForbiddenError } from "../../errors";

export const createClient: GraphQLFieldConfig<
  any,
  {
    enabled: boolean;
    name: string;
    oauth2Urls: string[];
    userIds: string[];
  },
  Context
> = {
  type: GraphQLClient,
  description: "Create a new client.",
  args: {
    enabled: {
      type: GraphQLBoolean,
      defaultValue: true
    },
    name: {
      type: new GraphQLNonNull(GraphQLString)
    },
    oauth2Urls: {
      type: new GraphQLNonNull(
        new GraphQLList(new GraphQLNonNull(GraphQLString))
      )
    },
    userIds: {
      type: new GraphQLNonNull(
        new GraphQLList(new GraphQLNonNull(GraphQLString))
      )
    }
  },
  async resolve(source, args, context): Promise<Client> {
    const { tx, token: t, realm } = context;

    if (!t) {
      throw new ForbiddenError("You must be authenticated to create a client.");
    }

    if (
      // can create any new clients
      !(await t.can(tx, `${realm}:client.*:write.*`)) &&
      // can create assigned new clients
      !(
        (await t.can(tx, `${realm}:client.assigned:write.*`)) &&
        args.userIds.includes(t.userId)
      )
    ) {
      throw new ForbiddenError(
        "You do not have permission to create a client."
      );
    }

    await tx.query("BEGIN DEFERRABLE");

    try {
      const id = v4();
      const client = await Client.write(
        tx,
        {
          id,
          enabled: args.enabled,
          name: args.name,
          oauth2Secrets: [randomBytes(16).toString("hex")],
          oauth2Urls: args.oauth2Urls,
          userIds: args.userIds
        },
        {
          recordId: v4(),
          createdByTokenId: t.id,
          createdAt: new Date()
        }
      );

      await tx.query("COMMIT");
      return client;
    } catch (error) {
      await tx.query("ROLLBACK");
      throw error;
    }
  }
};
