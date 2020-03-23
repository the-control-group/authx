import { v4 } from "uuid";
import { GraphQLFieldConfig, GraphQLList, GraphQLNonNull } from "graphql";
import { Context } from "../../Context";
import { GraphQLAuthorization } from "../GraphQLAuthorization";
import { Authorization } from "../../model";
import { DataLoaderExecutor } from "../../loader";
import { ForbiddenError } from "../../errors";
import { GraphQLUpdateAuthorizationInput } from "./GraphQLUpdateAuthorizationInput";

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
        new GraphQLList(new GraphQLNonNull(GraphQLUpdateAuthorizationInput))
      )
    }
  },
  async resolve(source, args, context): Promise<Promise<Authorization>[]> {
    const { pool, authorization: a, realm } = context;

    if (!a) {
      throw new ForbiddenError(
        "You must be authenticated to update a authorization."
      );
    }

    return args.authorizations.map(async input => {
      const tx = await pool.connect();
      try {
        // Make sure this transaction is used for queries made by the executor.
        const executor = new DataLoaderExecutor(tx);

        await tx.query("BEGIN DEFERRABLE");
        const before = await Authorization.read(executor, input.id, {
          forUpdate: true
        });

        if (
          !(await before.isAccessibleBy(realm, a, executor, {
            basic: "w",
            scopes: "",
            secrets: ""
          }))
        ) {
          throw new ForbiddenError(
            "You do not have permission to update this authorization."
          );
        }

        const authorization = await Authorization.write(
          executor,
          {
            ...before,
            enabled:
              typeof input.enabled === "boolean"
                ? input.enabled
                : before.enabled
          },
          {
            recordId: v4(),
            createdByAuthorizationId: a.id,
            createdByCredentialId: null,
            createdAt: new Date()
          }
        );

        await tx.query("COMMIT");

        // Update the context to use a new executor primed with the results of
        // this mutation, using the original connection pool.
        context.executor = new DataLoaderExecutor(pool, executor.context);

        return authorization;
      } catch (error) {
        await tx.query("ROLLBACK");
        throw error;
      } finally {
        tx.release();
      }
    });
  }
};
