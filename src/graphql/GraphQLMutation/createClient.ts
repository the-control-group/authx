import v4 from "uuid/v4";
import { randomBytes } from "crypto";
import {
  GraphQLBoolean,
  GraphQLFieldConfig,
  GraphQLList,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLString
} from "graphql";

import { Context } from "../Context";
import { GraphQLClient } from "../GraphQLClient";
import { Client } from "../../models";

export const GraphQLCreateClientResult = new GraphQLObjectType({
  name: "CreateClientResult",
  fields: () => ({
    success: { type: new GraphQLNonNull(GraphQLBoolean) },
    message: { type: GraphQLString },
    client: { type: GraphQLClient }
  })
});

export const createClient: GraphQLFieldConfig<
  any,
  {
    enabled: boolean;
    name: string;
    oauthUrls: string[];
    userIds: string[];
  },
  Context
> = {
  type: GraphQLCreateClientResult,
  description: "Create a new client.",
  args: {
    enabled: {
      type: GraphQLBoolean,
      defaultValue: true
    },
    name: {
      type: new GraphQLNonNull(GraphQLString)
    },
    oauthUrls: {
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
  async resolve(source, args, context) {
    const { tx, token: t, realm } = context;

    if (!t) {
      return {
        success: false,
        message: "You must be authenticated to create a client.",
        client: null
      };
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
      return {
        success: false,
        message: "You do not have permission to create a client.",
        client: null
      };
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
          oauthSecret: randomBytes(32).toString("hex"),
          oauthUrls: args.oauthUrls,
          userIds: args.userIds
        },
        {
          recordId: v4(),
          createdByTokenId: t.id,
          createdAt: new Date()
        }
      );

      await tx.query("COMMIT");
      return {
        success: true,
        message: null,
        client
      };
    } catch (error) {
      console.error(error);
      await tx.query("ROLLBACK");
      return {
        success: false,
        message: error.message,
        token: null
      };
    }
  }
};
