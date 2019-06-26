import v4 from "uuid/v4";
import { GraphQLFieldConfig, GraphQLNonNull, GraphQLList } from "graphql";

import { Context } from "../../Context";
import { GraphQLUser } from "../GraphQLUser";
import { User } from "../../model";
import { ForbiddenError } from "../../errors";
import { GraphQLUpdateUserInput } from "./GraphQLUpdateUserInput";

export const updateUsers: GraphQLFieldConfig<
  any,
  {
    users: {
      id: string;
      enabled: null | boolean;
      name: null | string;
    }[];
  },
  Context
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
    const { pool, authorization: a, realm } = context;

    if (!a) {
      throw new ForbiddenError(
        "You must be authenticated to update a authorization."
      );
    }

    return args.users.map(async input => {
      const tx = await pool.connect();
      try {
        await tx.query("BEGIN DEFERRABLE");

        const before = await User.read(tx, input.id);

        if (!(await before.isAccessibleBy(realm, a, tx, "write.basic"))) {
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
