import v4 from "uuid/v4";
import { randomBytes } from "crypto";
import { GraphQLFieldConfig, GraphQLList, GraphQLNonNull } from "graphql";

import { Context } from "../../Context";
import { GraphQLClient } from "../GraphQLClient";
import { Client } from "../../model";
import { ForbiddenError } from "../../errors";
import { GraphQLUpdateClientInput } from "./GraphQLUpdateClientInput";

export const updateClients: GraphQLFieldConfig<
  any,
  {
    clients: {
      id: string;
      enabled: null | boolean;
      name: null | string;
      description: null | string;
      addUrls: null | string[];
      removeUrls: null | string[];
      generateSecrets: null | number;
      removeSecrets: null | string[];
      assignUserIds: null | string[];
      unassignUserIds: null | string[];
    }[];
  },
  Context
> = {
  type: new GraphQLList(GraphQLClient),
  description: "Update a new client.",
  args: {
    clients: {
      type: new GraphQLNonNull(
        new GraphQLList(new GraphQLNonNull(GraphQLUpdateClientInput))
      )
    }
  },
  async resolve(source, args, context): Promise<Promise<Client>[]> {
    const { pool, authorization: a, realm } = context;

    if (!a) {
      throw new ForbiddenError("You must be authenticated to update a client.");
    }

    return args.clients.map(async input => {
      const tx = await pool.connect();
      try {
        await tx.query("BEGIN DEFERRABLE");
        const before = await Client.read(tx, input.id, {
          forUpdate: true
        });

        // write.basic -----------------------------------------------------------
        if (!(await before.isAccessibleBy(realm, a, tx, "write.basic"))) {
          throw new ForbiddenError(
            "You do not have permission to update this client."
          );
        }

        let urls = [...before.urls];

        // Assign users
        if (input.addUrls) {
          urls = [...urls, ...input.addUrls];
        }

        // Unassign users
        if (input.removeUrls) {
          const removeUrls = new Set(input.removeUrls);
          urls = urls.filter(id => !removeUrls.has(id));
        }

        // write.secrets ---------------------------------------------------------
        if (!(await before.isAccessibleBy(realm, a, tx, "write.secrets"))) {
          throw new ForbiddenError(
            "You do not have permission to update this client's secrets."
          );
        }

        let secrets = [...before.secrets];

        // Generate secrets
        if (input.generateSecrets) {
          for (let i = input.generateSecrets; i > 0; i--) {
            secrets.push(randomBytes(16).toString("hex"));
          }
        }

        // Remove secrets
        if (input.removeSecrets) {
          const removeSecrets = new Set(input.removeSecrets);
          secrets = secrets.filter(id => !removeSecrets.has(id));
        }

        // write.assignments -----------------------------------------------------
        if (!(await before.isAccessibleBy(realm, a, tx, "write.assignments"))) {
          throw new ForbiddenError(
            "You do not have permission to update this client's assignments."
          );
        }

        let userIds = [...before.userIds];

        // Assign users
        if (input.assignUserIds) {
          userIds = [...userIds, ...input.assignUserIds];
        }

        // Unassign users
        if (input.unassignUserIds) {
          const unassignUserIds = new Set(input.unassignUserIds);
          userIds = userIds.filter(id => !unassignUserIds.has(id));
        }

        const client = await Client.write(
          tx,
          {
            ...before,
            enabled:
              typeof input.enabled === "boolean"
                ? input.enabled
                : before.enabled,
            name: input.name || before.name,
            description: input.description || before.description,
            urls,
            secrets,
            userIds
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
      } finally {
        tx.release();
      }
    });
  }
};
