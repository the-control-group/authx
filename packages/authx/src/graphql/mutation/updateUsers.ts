import { v4 } from "uuid";
import { GraphQLFieldConfig, GraphQLNonNull, GraphQLList } from "graphql";
import { Context } from "../../Context";
import { GraphQLUser } from "../GraphQLUser";
import { User } from "../../model";
import { DataLoaderExecutor } from "../../loader";
import { validateIdFormat } from "../../util/validateIdFormat";
import { ForbiddenError, ValidationError } from "../../errors";
import { GraphQLUpdateUserInput } from "./GraphQLUpdateUserInput";

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
      )
    }
  },
  async resolve(source, args, context): Promise<Promise<User>[]> {
    const { pool, executor, authorization: a, realm } = context;

    if (!a) {
      throw new ForbiddenError(
        "You must be authenticated to update a authorization."
      );
    }

    return args.users.map(async input => {
      // Validate `id`.
      if (!validateIdFormat(input.id)) {
        throw new ValidationError("The provided `id` is an invalid ID.");
      }

      const tx = await pool.connect();
      try {
        // Make sure this transaction is used for queries made by the executor.
        const x = new DataLoaderExecutor(tx, executor.key);

        await tx.query("BEGIN DEFERRABLE");

        const before = await User.read(x, input.id, {
          forUpdate: true
        });

        if (
          !(await before.isAccessibleBy(realm, a, x, {
            basic: "w"
          }))
        ) {
          throw new ForbiddenError(
            "You do not have permission to update this user."
          );
        }

        const user = await User.write(
          x,
          {
            ...before,
            enabled:
              typeof input.enabled === "boolean"
                ? input.enabled
                : before.enabled,
            name: typeof input.name === "string" ? input.name : before.name
          },
          {
            recordId: v4(),
            createdByAuthorizationId: a.id,
            createdAt: new Date()
          }
        );

        await tx.query("COMMIT");
        return user;
      } catch (error) {
        await tx.query("ROLLBACK");
        throw error;
      } finally {
        tx.release();
      }
    });
  }
};
