import v4 from "uuid/v4";
import { randomBytes } from "crypto";
import {
  GraphQLBoolean,
  GraphQLFieldConfig,
  GraphQLID,
  GraphQLList,
  GraphQLNonNull,
  GraphQLInt,
  GraphQLString
} from "graphql";

import { Context } from "../Context";
import { GraphQLClient } from "../GraphQLClient";
import { Client } from "../../model";
import { ForbiddenError } from "../../errors";

export const updateClient: GraphQLFieldConfig<
  any,
  {
    id: string;
    enabled: null | boolean;
    name: null | string;
    addOauthUrls: null | string[];
    removeOauthUrls: null | string[];
    generateOauthSecrets: null | number;
    removeOauthSecrets: null | string[];
    assignUserIds: null | string[];
    unassignUserIds: null | string[];
  },
  Context
> = {
  type: GraphQLClient,
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
    addOauthUrls: {
      type: new GraphQLList(new GraphQLNonNull(GraphQLString))
    },
    removeOauthUrls: {
      type: new GraphQLList(new GraphQLNonNull(GraphQLString))
    },
    assignUserIds: {
      type: new GraphQLList(new GraphQLNonNull(GraphQLString))
    },
    unassignUserIds: {
      type: new GraphQLList(new GraphQLNonNull(GraphQLString))
    },
    generateOauthSecrets: {
      type: GraphQLInt
    },
    removeOauthSecrets: {
      type: new GraphQLList(new GraphQLNonNull(GraphQLString))
    }
  },
  async resolve(source, args, context): Promise<Client> {
    const { tx, token: t, realm } = context;

    if (!t) {
      throw new ForbiddenError("You must be authenticated to update a client.");
    }

    await tx.query("BEGIN DEFERRABLE");

    try {
      const before = await Client.read(tx, args.id);

      // write.basic -----------------------------------------------------------
      if (!(await before.isAccessibleBy(realm, t, tx, "write.basic"))) {
        throw new ForbiddenError(
          "You do not have permission to update this client."
        );
      }

      let urls = [...before.urls];

      // Assign users
      if (args.addOauthUrls) {
        urls = [...urls, ...args.addOauthUrls];
      }

      // Unassign users
      if (args.removeOauthUrls) {
        const removeOauthUrls = new Set(args.removeOauthUrls);
        urls = urls.filter(id => !removeOauthUrls.has(id));
      }

      // write.secrets ---------------------------------------------------------
      if (!(await before.isAccessibleBy(realm, t, tx, "write.secrets"))) {
        throw new ForbiddenError(
          "You do not have permission to update this client's secrets."
        );
      }

      let secrets = [...before.secrets];

      // Generate secrets
      if (args.generateOauthSecrets) {
        for (let i = args.generateOauthSecrets; i > 0; i--) {
          secrets.push(randomBytes(16).toString("hex"));
        }
      }

      // Remove secrets
      if (args.removeOauthSecrets) {
        const removeOauthSecrets = new Set(args.removeOauthSecrets);
        secrets = secrets.filter(id => !removeOauthSecrets.has(id));
      }

      // write.assignments -----------------------------------------------------
      if (!(await before.isAccessibleBy(realm, t, tx, "write.assignments"))) {
        throw new ForbiddenError(
          "You do not have permission to update this client's assignments."
        );
      }

      let userIds = [...before.userIds];

      // Assign users
      if (args.assignUserIds) {
        userIds = [...userIds, ...args.assignUserIds];
      }

      // Unassign users
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
          urls,
          secrets,
          userIds
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