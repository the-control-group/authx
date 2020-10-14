import { v4 } from "uuid";
import { Pool, PoolClient } from "pg";
import { GraphQLFieldConfig, GraphQLNonNull, GraphQLList } from "graphql";

import {
  Context,
  Credential,
  ForbiddenError,
  NotFoundError,
  ValidationError,
  validateIdFormat,
  DataLoaderExecutor,
  ReadonlyDataLoaderExecutor,
} from "@authx/authx";
import { OpenIdCredential } from "../../model";
import { GraphQLOpenIdCredential } from "../GraphQLOpenIdCredential";
import { GraphQLUpdateOpenIdCredentialInput } from "./GraphQLUpdateOpenIdCredentialInput";

export const updateOpenIdCredentials: GraphQLFieldConfig<
  any,
  Context,
  {
    credentials: {
      id: string;
      enabled: null | boolean;
    }[];
  }
> = {
  type: new GraphQLList(GraphQLOpenIdCredential),
  description: "Update a new credential.",
  args: {
    credentials: {
      type: new GraphQLNonNull(
        new GraphQLList(new GraphQLNonNull(GraphQLUpdateOpenIdCredentialInput))
      ),
    },
  },
  async resolve(source, args, context): Promise<Promise<OpenIdCredential>[]> {
    const { executor, authorization: a, realm } = context;

    if (!a) {
      throw new ForbiddenError(
        "You must be authenticated to update an credential."
      );
    }

    const strategies = executor.strategies;
    const pool = executor.connection;
    if (!(pool instanceof Pool)) {
      throw new Error(
        "INVARIANT: The executor connection is expected to be an instance of Pool."
      );
    }

    return args.credentials.map(async (input) => {
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

        if (!(before instanceof OpenIdCredential)) {
          throw new NotFoundError("No openid credential exists with this ID.");
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

        const credential = await OpenIdCredential.write(
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

        // Update the context to use a new executor primed with the results of
        // this mutation, using the original connection pool.
        executor.connection = pool;
        context.executor = executor as ReadonlyDataLoaderExecutor<Pool>;

        return credential;
      } catch (error) {
        await tx.query("ROLLBACK");
        throw error;
      } finally {
        tx.release();
      }
    });
  },
};
