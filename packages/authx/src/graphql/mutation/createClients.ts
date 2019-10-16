import v4 from "uuid/v4";
import { randomBytes } from "crypto";
import { GraphQLFieldConfig, GraphQLList, GraphQLNonNull } from "graphql";

import { Context } from "../../Context";
import { GraphQLClient } from "../GraphQLClient";
import { Client } from "../../model";
import { ForbiddenError, ConflictError, NotFoundError } from "../../errors";
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
      const tx = await pool.connect();
      try {
        if (
          // can create any new clients
          !(await a.can(tx, `${realm}:client.*:write.*`))
        ) {
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

          const id = v4();
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
