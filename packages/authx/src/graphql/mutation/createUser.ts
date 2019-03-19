import v4 from "uuid/v4";
import { GraphQLBoolean, GraphQLFieldConfig, GraphQLNonNull } from "graphql";

import { Context } from "../Context";
import { GraphQLUser } from "../GraphQLUser";
import { GraphQLContactInput } from "../GraphQLContactInput";
import { GraphQLUserType } from "../GraphQLUserType";
import { User, UserType, ContactInitialInput } from "../../model";
import { ForbiddenError } from "../../errors";

export const createUser: GraphQLFieldConfig<
  any,
  {
    enabled: boolean;
    type: UserType;
    contact: ContactInitialInput;
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
    contact: {
      type: new GraphQLNonNull(GraphQLContactInput)
    }
  },
  async resolve(source, args, context): Promise<User> {
    const { tx, token: t, realm } = context;

    if (!t) {
      throw new ForbiddenError("You must be authenticated to create a token.");
    }

    // can create a new user
    if (!(await t.can(tx, `${realm}:user.*:write.*`))) {
      throw new ForbiddenError("You must be authenticated to create a token.");
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
          contact: args.contact
        },
        {
          recordId: v4(),
          createdByTokenId: t.id,
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
