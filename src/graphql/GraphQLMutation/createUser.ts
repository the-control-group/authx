import v4 from "uuid/v4";
import {
  GraphQLBoolean,
  GraphQLFieldConfig,
  GraphQLObjectType,
  GraphQLString,
  GraphQLNonNull
} from "graphql";

import { Context } from "../Context";
import { GraphQLUser } from "../GraphQLUser";
import { GraphQLProfileInput } from "../GraphQLProfileInput";
import { GraphQLUserType } from "../GraphQLUserType";
import { User, UserType, ProfileInput } from "../../models";

export const GraphQLCreateUserResult = new GraphQLObjectType({
  name: "CreateUserResult",
  fields: () => ({
    success: { type: new GraphQLNonNull(GraphQLBoolean) },
    message: { type: GraphQLString },
    user: { type: GraphQLUser }
  })
});

export const createUser: GraphQLFieldConfig<
  any,
  {
    enabled: boolean;
    type: UserType;
    profile: ProfileInput;
  },
  Context
> = {
  type: GraphQLCreateUserResult,
  description: "Create a new user.",
  args: {
    enabled: {
      type: GraphQLBoolean,
      defaultValue: true
    },
    type: {
      type: new GraphQLNonNull(GraphQLUserType)
    },
    profile: {
      type: new GraphQLNonNull(GraphQLProfileInput)
    }
  },
  async resolve(source, args, context) {
    const { tx, token: t, realm } = context;

    if (!t) {
      return {
        success: false,
        message: "You must be authenticated to create a user.",
        token: null
      };
    }

    // can create a new user
    if (!(await t.can(tx, `${realm}:user.*:write.*`))) {
      return {
        success: false,
        message: "You do not have permission to create a user.",
        user: null
      };
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
          profile: {
            ...args.profile,
            id
          }
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
