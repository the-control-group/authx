import v4 from "uuid/v4";
import { isSuperset, isStrictSuperset } from "scopeutils";
import {
  GraphQLBoolean,
  GraphQLFieldConfig,
  GraphQLID,
  GraphQLList,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLString
} from "graphql";

import { Context } from "../Context";
import { GraphQLToken } from "../GraphQLToken";
import { Token, User } from "../../models";

export const GraphQLCreateTokenResult = new GraphQLObjectType({
  name: "CreateTokenResult",
  fields: () => ({
    success: { type: new GraphQLNonNull(GraphQLBoolean) },
    message: { type: GraphQLString },
    token: { type: GraphQLToken }
  })
});

export const createToken: GraphQLFieldConfig<
  any,
  {
    enabled: boolean;
    userId: string;
    grantId: string;
    scopes: string[];
  },
  Context
> = {
  type: GraphQLCreateTokenResult,
  description: "Create a new token.",
  args: {
    enabled: {
      type: GraphQLBoolean,
      defaultValue: true
    },
    userId: {
      type: new GraphQLNonNull(GraphQLID)
    },
    grantId: {
      type: new GraphQLNonNull(GraphQLID)
    },
    scopes: {
      type: new GraphQLNonNull(
        new GraphQLList(new GraphQLNonNull(GraphQLString))
      )
    }
  },
  async resolve(source, args, context) {
    const { tx, token: t, realm } = context;

    if (!t) {
      return {
        success: false,
        message: "You must be authenticated to create a token.",
        token: null
      };
    }

    if (
      // can create tokens for all users
      !(await t.can(tx, `${realm}:token.*.*:write.*`)) &&
      // can create tokens for users with equal access
      !(
        (await t.can(tx, `${realm}:token.equal.*:write.*`)) &&
        isSuperset(
          await (await t.user(tx)).access(tx),
          await (await User.read(tx, args.userId)).access(tx)
        )
      ) &&
      // can create tokens for users with lesser access
      !(
        (await t.can(tx, `${realm}:token.equal.lesser:write.*`)) &&
        isStrictSuperset(
          await (await t.user(tx)).access(tx),
          await (await User.read(tx, args.userId)).access(tx)
        )
      ) &&
      // can create tokens for self
      !(
        (await t.can(tx, `${realm}:token.equal.self:write.*`)) &&
        args.userId === t.userId
      )
    ) {
      return {
        success: false,
        message: "You do not have permission to create a token.",
        token: null
      };
    }

    await tx.query("BEGIN DEFERRABLE");

    try {
      const id = v4();
      const token = await Token.write(
        tx,
        {
          id,
          enabled: args.enabled,
          userId: args.userId,
          grantId: args.grantId,
          scopes: args.scopes
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
        token
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
