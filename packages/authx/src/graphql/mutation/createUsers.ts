import v4 from "uuid/v4";
import { GraphQLFieldConfig, GraphQLNonNull, GraphQLList } from "graphql";

import { Context } from "../../Context";
import { GraphQLUser } from "../GraphQLUser";
import { User, UserType } from "../../model";
import { ForbiddenError } from "../../errors";
import { GraphQLCreateUserInput } from "./GraphQLCreateUserInput";

export const createUsers: GraphQLFieldConfig<
  any,
  {
    users: {
      type: UserType;
      enabled: boolean;
      name: string;
    }[];
  },
  Context
> = {
  type: new GraphQLList(GraphQLUser),
  description: "Create a new user.",
  args: {
    users: {
      type: new GraphQLNonNull(
        new GraphQLList(new GraphQLNonNull(GraphQLCreateUserInput))
      )
    }
  },
  async resolve(source, args, context): Promise<Promise<User>[]> {
    const { pool, authorization: a, realm } = context;

    if (!a) {
      throw new ForbiddenError(
        "You must be authenticated to create a authorization."
      );
    }

    return args.users.map(async input => {
      const tx = await pool.connect();
      try {
        // can create a new user
        if (!(await a.can(tx, `${realm}:user.*:write.*`))) {
          throw new ForbiddenError(
            "You must be authenticated to create a authorization."
          );
        }

        try {
          await tx.query("BEGIN DEFERRABLE");
          const id = v4();
          const user = await User.write(
            tx,
            {
              id,
              enabled: input.enabled,
              type: input.type,
              name: input.name
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
        }
      } finally {
        tx.release();
      }
    });
  }
};
