import v4 from "uuid/v4";
import {
  GraphQLID,
  GraphQLBoolean,
  GraphQLFieldConfig,
  GraphQLObjectType,
  GraphQLString,
  GraphQLNonNull
} from "graphql";

import { Context } from "../Context";
import { GraphQLUser } from "../GraphQLUser";
import { GraphQLProfileInput } from "../GraphQLProfileInput";
import { User, ProfileInput } from "../../models";
import { ForbiddenError } from "../../errors";

export const updateUser: GraphQLFieldConfig<
  any,
  {
    id: string;
    enabled: null | boolean;
    profile: null | ProfileInput;
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
    profile: {
      type: GraphQLProfileInput
    }
  },
  async resolve(source, args, context): Promise<User> {
    const { tx, token: t, realm } = context;

    if (!t) {
      throw new ForbiddenError("You must be authenticated to update a token.");
    }

    if (
      // can update any user
      !(await t.can(tx, `${realm}:user.*:write.basic`)) &&
      !(
        (await t.can(tx, `${realm}:user.self:write.basic`)) &&
        args.id === t.userId
      )
    ) {
      throw new ForbiddenError("You do not have permission to update a user.");
    }

    await tx.query("BEGIN DEFERRABLE");

    try {
      const before = await User.read(tx, args.id);
      const user = await User.write(
        tx,
        {
          ...before,
          enabled:
            typeof args.enabled === "boolean" ? args.enabled : before.enabled,
          profile: args.profile
            ? {
                ...args.profile,
                id: args.id
              }
            : before.profile
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
