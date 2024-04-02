import { v4 } from "uuid";
import pg, { Pool, PoolClient } from "pg";
import { GraphQLFieldConfig, GraphQLNonNull, GraphQLList } from "graphql";

import {
  Context,
  Credential,
  ForbiddenError,
  NotFoundError,
  ValidationError,
  validateIdFormat,
  DataLoaderExecutor,
} from "@authx/authx";
import { EmailCredential } from "../../model/index.js";
import { GraphQLEmailCredential } from "../GraphQLEmailCredential.js";
import { GraphQLUpdateEmailCredentialInput } from "./GraphQLUpdateEmailCredentialInput.js";

export const updateEmailCredentials: GraphQLFieldConfig<
  any,
  Context,
  {
    credentials: {
      id: string;
      enabled: null | boolean;
    }[];
  }
> = {
  type: new GraphQLList(GraphQLEmailCredential),
  description: "Update a new credential.",
  args: {
    credentials: {
      type: new GraphQLNonNull(
        new GraphQLList(new GraphQLNonNull(GraphQLUpdateEmailCredentialInput)),
      ),
    },
  },
  async resolve(source, args, context): Promise<Promise<EmailCredential>[]> {
    const {
      executor: { strategies, connection: pool },
      authorization: a,
      realm,
    } = context;

    if (!a) {
      throw new ForbiddenError(
        "You must be authenticated to update an credential.",
      );
    }

    if (!(pool instanceof pg.Pool)) {
      throw new Error(
        "INVARIANT: The executor connection is expected to be an instance of Pool.",
      );
    }

    const results = args.credentials.map(async (input) => {
      // Validate `id`.
      if (!validateIdFormat(input.id)) {
        throw new ValidationError("The provided `id` is an invalid ID.");
      }

      const tx = await pool.connect();
      try {
        // Make sure this transaction is used for queries made by the executor.
        const executor = new DataLoaderExecutor<Pool | PoolClient>(
          tx,
          strategies,
        );

        await tx.query("BEGIN DEFERRABLE");

        const before = await Credential.read(tx, input.id, strategies, {
          forUpdate: true,
        });

        if (!(before instanceof EmailCredential)) {
          throw new NotFoundError("No email credential exists with this ID.");
        }

        if (
          !(await before.isAccessibleBy(realm, a, executor, {
            basic: "w",
            details: "",
          }))
        ) {
          throw new ForbiddenError(
            "You do not have permission to update this credential.",
          );
        }

        const credential = await EmailCredential.write(
          tx,
          {
            ...before,
            enabled:
              typeof input.enabled === "boolean"
                ? input.enabled
                : before.enabled,
          },
          {
            recordId: v4(),
            createdByAuthorizationId: a.id,
            createdAt: new Date(),
          },
        );

        await tx.query("COMMIT");

        // Clear and prime the loader.
        Credential.clear(executor, credential.id);
        Credential.prime(executor, credential.id, credential);

        return credential;
      } catch (error) {
        await tx.query("ROLLBACK");
        throw error;
      } finally {
        tx.release();
      }
    });

    // Wait for all mutations to succeed or fail.
    await Promise.allSettled(results);

    // Set a new executor (clearing all memoized values).
    context.executor = new DataLoaderExecutor<Pool>(pool, strategies);

    return results;
  },
};
