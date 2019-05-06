import v4 from "uuid/v4";
import { randomBytes } from "crypto";
import {
  GraphQLBoolean,
  GraphQLFieldConfig,
  GraphQLList,
  GraphQLNonNull,
  GraphQLString
} from "graphql";

import { Context } from "../../Context";
import { GraphQLClient } from "../GraphQLClient";
import { Client } from "../../model";
import { ForbiddenError } from "../../errors";

export const createClient: GraphQLFieldConfig<
  any,
  {
    enabled: boolean;
    name: string;
    urls: string[];
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
    urls: {
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
    const { tx, authorization: a, realm } = context;

    if (!a) {
      throw new ForbiddenError("You must be authenticated to create a client.");
    }

    if (
      // can create any new clients
      !(await a.can(tx, `${realm}:client.*:write.*`)) &&
      // can create assigned new clients
      !(
        (await a.can(tx, `${realm}:client.assigned:write.*`)) &&
        args.userIds.includes(a.userId)
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
          secrets: [randomBytes(16).toString("hex")],
          urls: args.urls,
          userIds: args.userIds
        },
        {
          recordId: v4(),
          createdByAuthorizationId: a.id,
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
