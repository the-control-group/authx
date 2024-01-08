import { v4 } from "uuid";
import { Pool, PoolClient } from "pg";
import { GraphQLFieldConfig, GraphQLNonNull, GraphQLList } from "graphql";
import { Context } from "../../Context.js";
import { GraphQLUser } from "../GraphQLUser.js";
import { User } from "../../model/index.js";
import { DataLoaderExecutor } from "../../loader.js";
import { validateIdFormat } from "../../util/validateIdFormat.js";
import { ForbiddenError, ValidationError } from "../../errors.js";
import { GraphQLUpdateUserInput } from "./GraphQLUpdateUserInput.js";

export const updateUsers: GraphQLFieldConfig<
  any,
  Context,
  {
    users: {
      id: string;
      enabled: null | boolean;
      name: null | string;
    }[];
  }
> = {
  type: new GraphQLList(GraphQLUser),
  description: "Update a new user.",
  args: {
    users: {
      type: new GraphQLNonNull(
        new GraphQLList(new GraphQLNonNull(GraphQLUpdateUserInput))
      ),
    },
  },
  async resolve(source, args, context): Promise<Promise<User>[]> {
    const {
      executor: { strategies, connection: pool },
      authorization: a,
      realm,
    } = context;

    if (!a) {
      throw new ForbiddenError(
        "You must be authenticated to update a authorization."
      );
    }

    if (!(pool instanceof Pool)) {
      throw new Error(
        "INVARIANT: The executor connection is expected to be an instance of Pool."
      );
    }

    const results = args.users.map(async (input) => {
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

        const before = await User.read(tx, input.id, {
          forUpdate: true,
        });

        if (
          !(await before.isAccessibleBy(realm, a, executor, {
            basic: "w",
            scopes: "",
          }))
        ) {
          throw new ForbiddenError(
            "You do not have permission to update this user."
          );
        }

        const user = await User.write(
          tx,
          {
            ...before,
            enabled:
              typeof input.enabled === "boolean"
                ? input.enabled
                : before.enabled,
            name: typeof input.name === "string" ? input.name : before.name,
          },
          {
            recordId: v4(),
            createdByAuthorizationId: a.id,
            createdAt: new Date(),
          }
        );

        await tx.query("COMMIT");

        // Clear and prime the loader.
        User.clear(executor, user.id);
        User.prime(executor, user.id, user);

        return user;
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
