import { v4 } from "uuid";
import { Pool, PoolClient } from "pg";
import { GraphQLList, GraphQLFieldConfig, GraphQLNonNull } from "graphql";

import {
  Context,
  Authority,
  ForbiddenError,
  NotFoundError,
  ValidationError,
  validateIdFormat,
  DataLoaderExecutor,
} from "@authx/authx";
import { PasswordAuthority } from "../../model/index.js";
import { GraphQLPasswordAuthority } from "../GraphQLPasswordAuthority.js";
import { GraphQLUpdatePasswordAuthorityInput } from "./GraphQLUpdatePasswordAuthorityInput.js";

export const updatePasswordAuthorities: GraphQLFieldConfig<
  any,
  Context,
  {
    authorities: {
      id: string;
      enabled: null | boolean;
      name: null | string;
      description: null | string;
      rounds: null | number;
    }[];
  }
> = {
  type: new GraphQLList(GraphQLPasswordAuthority),
  description: "Update a new authority.",
  args: {
    authorities: {
      type: new GraphQLNonNull(
        new GraphQLList(new GraphQLNonNull(GraphQLUpdatePasswordAuthorityInput))
      ),
    },
  },
  async resolve(source, args, context): Promise<Promise<PasswordAuthority>[]> {
    const {
      executor: { strategies, connection: pool },
      authorization: a,
      realm,
    } = context;

    if (!a) {
      throw new ForbiddenError(
        "You must be authenticated to update an authority."
      );
    }

    if (!(pool instanceof Pool)) {
      throw new Error(
        "INVARIANT: The executor connection is expected to be an instance of Pool."
      );
    }

    const results = args.authorities.map(async (input) => {
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

        const before = await Authority.read(tx, input.id, strategies, {
          forUpdate: true,
        });

        if (!(before instanceof PasswordAuthority)) {
          throw new NotFoundError("No password authority exists with this ID.");
        }

        if (
          !(await before.isAccessibleBy(realm, a, executor, {
            basic: "w",
            details: "",
          }))
        ) {
          throw new ForbiddenError(
            "You do not have permission to update this authority."
          );
        }

        if (
          typeof input.rounds === "number" &&
          !(await before.isAccessibleBy(realm, a, executor, {
            basic: "w",
            details: "w",
          }))
        ) {
          throw new ForbiddenError(
            "You do not have permission to update this authority's details."
          );
        }

        const authority = await PasswordAuthority.write(
          tx,
          {
            ...before,
            enabled:
              typeof input.enabled === "boolean"
                ? input.enabled
                : before.enabled,
            name: typeof input.name === "string" ? input.name : before.name,
            description:
              typeof input.description === "string"
                ? input.description
                : before.description,
            details: {
              ...before.details,
              rounds:
                typeof input.rounds === "number"
                  ? input.rounds
                  : before.details.rounds,
            },
          },
          {
            recordId: v4(),
            createdByAuthorizationId: a.id,
            createdAt: new Date(),
          }
        );

        await tx.query("COMMIT");

        // Clear and prime the loader.
        Authority.clear(executor, authority.id);
        Authority.prime(executor, authority.id, authority);

        return authority;
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
