import v4 from "uuid/v4";
import {
  GraphQLBoolean,
  GraphQLFieldConfig,
  GraphQLNonNull,
  GraphQLString
} from "graphql";

import { Context } from "../../Context";
import { GraphQLUser } from "../GraphQLUser";
import { GraphQLUserType } from "../GraphQLUserType";
import { User, UserType } from "../../model";
import { ForbiddenError } from "../../errors";

export const createUser: GraphQLFieldConfig<
  any,
  {
    type: UserType;
    enabled: boolean;
    name: string;
  },
  Context
> = {
  type: GraphQLUser,
  description: "Create a new user.",
  args: {
    enabled: {
      type: GraphQLBoolean,
      defaultValue: true
    },
    type: {
      type: new GraphQLNonNull(GraphQLUserType)
    },
    name: {
      type: new GraphQLNonNull(GraphQLString)
    }
  },
  async resolve(source, args, context): Promise<User> {
    const { tx, authorization: a, realm } = context;

    if (!a) {
      throw new ForbiddenError(
        "You must be authenticated to create a authorization."
      );
    }

    // can create a new user
    if (!(await a.can(tx, `${realm}:user.*:write.*`))) {
      throw new ForbiddenError(
        "You must be authenticated to create a authorization."
      );
    }

    await tx.query("BEGIN DEFERRABLE");

    try {
      const id = v4();
      const user = await User.write(
        tx,
        {
          id,
          enabled: args.enabled,
          type: args.type,
          name: args.name
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
  }
};
