import v4 from "uuid/v4";
import { URL } from "url";
import { randomBytes } from "crypto";
import { GraphQLFieldConfig, GraphQLList, GraphQLNonNull } from "graphql";
import { getIntersection, simplify } from "@authx/scopes";
import { Context } from "../../Context";
import { GraphQLClient } from "../GraphQLClient";
import { Client, Role } from "../../model";
import { makeAdministrationScopes } from "../../util/makeAdministrationScopes";
import { validateIdFormat } from "../../util/validateIdFormat";
import {
  ForbiddenError,
  ConflictError,
  NotFoundError,
  ValidationError
} from "../../errors";
import { GraphQLCreateClientInput } from "./GraphQLCreateClientInput";

export const createClients: GraphQLFieldConfig<
  any,
  {
    clients: {
      id: null | string;
      enabled: boolean;
      name: string;
      description: string;
      urls: string[];
      administration: {
        roleId: string;
        scopes: string[];
      }[];
    }[];
  },
  Context
> = {
  type: new GraphQLList(GraphQLClient),
  description: "Create a new client.",
  args: {
    clients: {
      type: new GraphQLNonNull(
        new GraphQLList(new GraphQLNonNull(GraphQLCreateClientInput))
      )
    }
  },
  async resolve(source, args, context): Promise<Promise<Client>[]> {
    const { pool, authorization: a, realm } = context;

    if (!a) {
      throw new ForbiddenError("You must be authenticated to create a client.");
    }

    return args.clients.map(async input => {
      // Validate `id`.
      if (typeof input.id === "string" && !validateIdFormat(input.id)) {
        throw new ValidationError("The provided `id` is an invalid ID.");
      }

      // Validate `urls`.
      for (const url of input.urls) {
        try {
          new URL(url);
        } catch (error) {
          throw new ValidationError(
            "The provided `urls` list contains an invalid URL."
          );
        }
      }

      // Validate `administration`.
      for (const { roleId } of input.administration) {
        if (!validateIdFormat(roleId)) {
          throw new ValidationError(
            "The provided `administration` list contains a `roleId` that is an invalid ID."
          );
        }
      }

      /* eslint-disable @typescript-eslint/camelcase */
      const values: { [name: string]: null | string } = {
        current_authorization_id: a.id,
        current_user_id: a.userId,
        ...(a.grantId ? { current_grant_id: a.grantId } : null)
      };
      /* eslint-enable @typescript-eslint/camelcase */

      const tx = await pool.connect();
      try {
        if (!(await a.can(tx, values, `${realm}:client.......:*...*.`))) {
          throw new ForbiddenError(
            "You do not have permission to create a client."
          );
        }

        try {
          await tx.query("BEGIN DEFERRABLE");

          // Make sure the ID isn't already in use.
          if (input.id) {
            try {
              await Client.read(tx, input.id, { forUpdate: true });
              throw new ConflictError();
            } catch (error) {
              if (!(error instanceof NotFoundError)) {
                throw error;
              }
            }
          }

          const id = input.id || v4();
          const client = await Client.write(
            tx,
            {
              id,
              enabled: input.enabled,
              name: input.name,
              description: input.description,
              secrets: [randomBytes(16).toString("hex")],
              urls: input.urls
            },
            {
              recordId: v4(),
              createdByAuthorizationId: a.id,
              createdAt: new Date()
            }
          );

          const possibleAdministrationScopes = makeAdministrationScopes(
            await a.access(tx, values),
            realm,
            "client",
            id,
            ["r....", "r...r.", "w....", "w...w."]
          );

          // Add administration scopes.
          for (const { roleId, scopes } of input.administration) {
            const role = await Role.read(tx, roleId, { forUpdate: true });

            if (!role.isAccessibleBy(realm, a, tx, "w..w..")) {
              throw new ForbiddenError(
                `You do not have permission to modify the scopes of role ${roleId}.`
              );
            }

            await Role.write(
              tx,
              {
                ...role,
                scopes: simplify([
                  ...role.scopes,
                  ...getIntersection(possibleAdministrationScopes, scopes)
                ])
              },
              {
                recordId: v4(),
                createdByAuthorizationId: a.id,
                createdAt: new Date()
              }
            );
          }

          await tx.query("COMMIT");
          return client;
        } catch (error) {
          await tx.query("ROLLBACK");
          throw error;
        }
      } finally {
        tx.release();
      }
    });
  }
};
