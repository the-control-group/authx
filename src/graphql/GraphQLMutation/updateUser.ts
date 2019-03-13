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

export const GraphQLUpdateUserResult = new GraphQLObjectType({
  name: "UpdateUserResult",
  fields: () => ({
    success: { type: new GraphQLNonNull(GraphQLBoolean) },
    message: { type: GraphQLString },
    user: { type: GraphQLUser }
  })
});

export const updateUser: GraphQLFieldConfig<
  any,
  {
    id: string;
    enabled: null | boolean;
    profile: null | ProfileInput;
  },
  Context
> = {
  type: GraphQLUpdateUserResult,
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
  async resolve(source, args, context) {
    const { tx, token: t, realm } = context;

    if (!t) {
      return {
        success: false,
        message: "You must be authenticated to update a user.",
        token: null
      };
    }

    if (
      // can update any user
      !(await t.can(tx, `${realm}:user.*:write.basic`)) &&
      !(
        (await t.can(tx, `${realm}:user.self:write.basic`)) &&
        args.id === t.userId
      )
    ) {
      return {
        success: false,
        message: "You do not have permission to update a user.",
        user: null
      };
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
      return {
        success: true,
        message: null,
        user
      };
    } catch (error) {
      console.error(error);
      await tx.query("ROLLBACK");
      return {
        success: false,
        message: error.message,
        token: null
      };
    }
  }
};
