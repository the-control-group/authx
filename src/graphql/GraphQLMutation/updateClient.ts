import v4 from "uuid/v4";
import { randomBytes } from "crypto";
import {
  GraphQLBoolean,
  GraphQLFieldConfig,
  GraphQLID,
  GraphQLList,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLString
} from "graphql";

import { Context } from "../Context";
import { GraphQLClient } from "../GraphQLClient";
import { Client, User } from "../../models";

export const GraphQLUpdateClientResult = new GraphQLObjectType({
  name: "UpdateClientResult",
  fields: () => ({
    success: { type: new GraphQLNonNull(GraphQLBoolean) },
    message: { type: GraphQLString },
    client: { type: GraphQLClient }
  })
});

export const updateClient: GraphQLFieldConfig<
  any,
  {
    id: string;
    enabled: null | boolean;
    name: null | string;
    oauthUrls: null | string[];
    assignUserIds: null | string[];
    unassignUserIds: null | string[];
    generateOauthSecrets: null | number;
    removeOauthSecrets: string[];
  },
  Context
> = {
  type: GraphQLUpdateClientResult,
  description: "Update a new client.",
  args: {
    id: {
      type: new GraphQLNonNull(GraphQLID)
    },
    enabled: {
      type: GraphQLBoolean
    },
    name: {
      type: GraphQLString
    },
    oauthUrls: {
      type: new GraphQLList(new GraphQLNonNull(GraphQLString))
    },
    assignUserIds: {
      type: new GraphQLList(new GraphQLNonNull(GraphQLString))
    },
    unassignUserIds: {
      type: new GraphQLList(new GraphQLNonNull(GraphQLString))
    }
  },
  async resolve(source, args, context) {
    const { tx, token: t, realm } = context;

    if (!t) {
      return {
        success: false,
        message: "You must be authenticated to update a client.",
        client: null
      };
    }

    await tx.query("BEGIN DEFERRABLE");

    try {
      const before = await Client.read(tx, args.id);

      // write.basic -----------------------------------------------------------
      if (
        // can update all clients
        !(await t.can(tx, `${realm}:client.*:write.basic`)) &&
        // can update assigned clients
        !(
          (await t.can(tx, `${realm}:client.assigned:write.basic`)) &&
          before.userIds.has(t.userId)
        )
      ) {
        throw new Error("You do not have permission to update this client.");
      }

      // write.secrets ---------------------------------------------------------
      if (
        (args.generateOauthSecrets || args.removeOauthSecrets) &&
        // can update all clients
        !(await t.can(tx, `${realm}:client.*:write.secrets`)) &&
        // can update assigned clients
        !(
          (await t.can(tx, `${realm}:client.assigned:write.secrets`)) &&
          before.userIds.has(t.userId)
        )
      ) {
        throw new Error(
          "You do not have permission to update this client's secrets."
        );
      }

      let oauthSecrets = [...before.oauthSecrets];

      // assign users
      if (args.generateOauthSecrets) {
        for (let i = args.generateOauthSecrets; i >= 0; i--) {
          oauthSecrets.push(randomBytes(32).toString("hex"));
        }
      }

      // unassign users
      if (args.removeOauthSecrets) {
        const removeOauthSecrets = new Set(args.removeOauthSecrets);
        oauthSecrets = oauthSecrets.filter(id => !removeOauthSecrets.has(id));
      }

      // write.assignments -----------------------------------------------------
      if (
        (args.assignUserIds || args.unassignUserIds) &&
        // can update all clients
        !(await t.can(tx, `${realm}:client.*:write.assignments`)) &&
        // can update assigned clients
        !(
          (await t.can(tx, `${realm}:client.assigned:write.assignments`)) &&
          before.userIds.has(t.userId)
        )
      ) {
        throw new Error(
          "You do not have permission to update this client's assignments."
        );
      }

      let userIds = [...before.userIds];

      // assign users
      if (args.assignUserIds) {
        userIds = [...userIds, ...args.assignUserIds];
      }

      // unassign users
      if (args.unassignUserIds) {
        const unassignUserIds = new Set(args.unassignUserIds);
        userIds = userIds.filter(id => !unassignUserIds.has(id));
      }

      const client = await Client.write(
        tx,
        {
          ...before,
          enabled:
            typeof args.enabled === "boolean" ? args.enabled : before.enabled,
          name: args.name || before.name,
          userIds
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
        client: null
      };
    }
  }
};
