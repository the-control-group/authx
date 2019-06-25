import v4 from "uuid/v4";
import {
  GraphQLID,
  GraphQLBoolean,
  GraphQLFieldConfig,
  GraphQLString,
  GraphQLNonNull
} from "graphql";

import { Context } from "../../Context";
import { GraphQLUser } from "../GraphQLUser";
import { User } from "../../model";
import { ForbiddenError } from "../../errors";

export const updateUser: GraphQLFieldConfig<
  any,
  {
    id: string;
    enabled: null | boolean;
    name: null | string;
  },
  Context
> = {
  type: GraphQLUser,
  description: "Update a new user.",
  args: {
    id: {
      type: new GraphQLNonNull(GraphQLID)
    },
    enabled: {
      type: GraphQLBoolean
    },
    name: {
      type: GraphQLString
    }
  },
  async resolve(source, args, context): Promise<User> {
    const { pool, authorization: a, realm } = context;

    if (!a) {
      throw new ForbiddenError(
        "You must be authenticated to update a authorization."
      );
    }

    const tx = await pool.connect();
    try {
      await tx.query("BEGIN DEFERRABLE");

      const before = await User.read(tx, args.id);

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
            typeof args.enabled === "boolean" ? args.enabled : before.enabled,
          name: typeof args.name === "string" ? args.name : before.name
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
  }
};
