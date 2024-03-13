import { v4 } from "uuid";
import pg, { Pool, PoolClient } from "pg";
import { GraphQLFieldConfig, GraphQLList, GraphQLNonNull } from "graphql";
import { Context } from "../../Context.js";
import { GraphQLAuthorization } from "../GraphQLAuthorization.js";
import { Authorization } from "../../model/index.js";
import { DataLoaderExecutor } from "../../loader.js";
import { ForbiddenError } from "../../errors.js";
import { GraphQLUpdateAuthorizationInput } from "./GraphQLUpdateAuthorizationInput.js";

export const updateAuthorizations: GraphQLFieldConfig<
  any,
  Context,
  {
    authorizations: {
      id: string;
      enabled: null | boolean;
    }[];
  }
> = {
  type: new GraphQLList(GraphQLAuthorization),
  description: "Update a new authorization.",
  args: {
    authorizations: {
      type: new GraphQLNonNull(
        new GraphQLList(new GraphQLNonNull(GraphQLUpdateAuthorizationInput)),
      ),
    },
  },
  async resolve(source, args, context): Promise<Promise<Authorization>[]> {
    const {
      executor: { strategies, connection: pool },
      authorization: a,
      realm,
    } = context;

    if (!a) {
      throw new ForbiddenError(
        "You must be authenticated to update a authorization.",
      );
    }

    if (!(pool instanceof pg.Pool)) {
      throw new Error(
        "INVARIANT: The executor connection is expected to be an instance of Pool.",
      );
    }

    const results = args.authorizations.map(async (input) => {
      const tx = await pool.connect();
      try {
        // Make sure this transaction is used for queries made by the executor.
        const executor = new DataLoaderExecutor<Pool | PoolClient>(
          tx,
          strategies,
        );

        await tx.query("BEGIN DEFERRABLE");
        const before = await Authorization.read(tx, input.id, {
          forUpdate: true,
        });

        if (
          !(await before.isAccessibleBy(realm, a, executor, {
            basic: "w",
            scopes: "",
            secrets: "",
          }))
        ) {
          throw new ForbiddenError(
            "You do not have permission to update this authorization.",
          );
        }

        const authorization = await Authorization.write(
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
            createdByCredentialId: null,
            createdAt: new Date(),
          },
        );

        await tx.query("COMMIT");

        // Clear and prime the loader.
        Authorization.clear(executor, authorization.id);
        Authorization.prime(executor, authorization.id, authorization);

        return authorization;
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
