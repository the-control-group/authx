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

import { Context } from "../../Context";
import { GraphQLClient } from "../GraphQLClient";
import { Client } from "../../model";
import { ForbiddenError } from "../../errors";

export const updateClient: GraphQLFieldConfig<
  any,
  {
    id: string;
    enabled: null | boolean;
    name: null | string;
    addUrls: null | string[];
    removeUrls: null | string[];
    generateSecrets: null | number;
    removeSecrets: null | string[];
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
    addUrls: {
      type: new GraphQLList(new GraphQLNonNull(GraphQLString))
    },
    removeUrls: {
      type: new GraphQLList(new GraphQLNonNull(GraphQLString))
    },
    assignUserIds: {
      type: new GraphQLList(new GraphQLNonNull(GraphQLString))
    },
    unassignUserIds: {
      type: new GraphQLList(new GraphQLNonNull(GraphQLString))
    },
    generateSecrets: {
      type: GraphQLInt
    },
    removeSecrets: {
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
      if (args.addUrls) {
        urls = [...urls, ...args.addUrls];
      }

      // Unassign users
      if (args.removeUrls) {
        const removeUrls = new Set(args.removeUrls);
        urls = urls.filter(id => !removeUrls.has(id));
      }

      // write.secrets ---------------------------------------------------------
      if (!(await before.isAccessibleBy(realm, t, tx, "write.secrets"))) {
        throw new ForbiddenError(
          "You do not have permission to update this client's secrets."
        );
      }

      let secrets = [...before.secrets];

      // Generate secrets
      if (args.generateSecrets) {
        for (let i = args.generateSecrets; i > 0; i--) {
          secrets.push(randomBytes(16).toString("hex"));
        }
      }

      // Remove secrets
      if (args.removeSecrets) {
        const removeSecrets = new Set(args.removeSecrets);
        secrets = secrets.filter(id => !removeSecrets.has(id));
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
