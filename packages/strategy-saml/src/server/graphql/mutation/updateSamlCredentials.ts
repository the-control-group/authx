import { v4 } from "uuid";
import pg, { Pool, PoolClient } from "pg";
import { GraphQLFieldConfig, GraphQLList, GraphQLNonNull } from "graphql";

import {
  Context,
  Credential,
  DataLoaderExecutor,
  ForbiddenError,
  NotFoundError,
  validateIdFormat,
  ValidationError,
} from "@authx/authx";
import { SamlCredential } from "../../model/index.js";
import { GraphQLSamlCredential } from "../GraphQLSamlCredential.js";
import { GraphQLUpdateSamlCredentialInput } from "./GraphQLUpdateSamlCredentialInput.js";

export const updateSamlCredentials: GraphQLFieldConfig<
  any,
  Context,
  {
    credentials: {
      id: string;
      enabled: null | boolean;
    }[];
  }
> = {
  type: new GraphQLList(GraphQLSamlCredential),
  description: "Update a new credential.",
  args: {
    credentials: {
      type: new GraphQLNonNull(
        new GraphQLList(new GraphQLNonNull(GraphQLUpdateSamlCredentialInput))
      ),
    },
  },
  async resolve(source, args, context): Promise<Promise<SamlCredential>[]> {
    const {
      executor: { strategies, connection: pool },
      authorization: a,
      realm,
    } = context;

    if (!a) {
      throw new ForbiddenError(
        "You must be authenticated to update an credential."
      );
    }

    if (!(pool instanceof pg.Pool)) {
      throw new Error(
        "INVARIANT: The executor connection is expected to be an instance of Pool."
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
          strategies
        );

        await tx.query("BEGIN DEFERRABLE");

        const before = await Credential.read(tx, input.id, strategies, {
          forUpdate: true,
        });

        if (!(before instanceof SamlCredential)) {
          throw new NotFoundError("No Saml credential exists with this ID.");
        }

        if (
          !(await before.isAccessibleBy(realm, a, executor, {
            basic: "w",
            details: "",
          }))
        ) {
          throw new ForbiddenError(
            "You do not have permission to update this credential."
          );
        }

        const credential = await SamlCredential.write(
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
          }
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
