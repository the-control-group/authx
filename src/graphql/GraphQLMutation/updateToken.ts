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

export const GraphQLUpdateTokenResult = new GraphQLObjectType({
  name: "UpdateTokenResult",
  fields: () => ({
    success: { type: new GraphQLNonNull(GraphQLBoolean) },
    message: { type: GraphQLString },
    token: { type: GraphQLToken }
  })
});

export const updateToken: GraphQLFieldConfig<
  any,
  {
    id: string;
    enabled: null | boolean;
    scopes: null | string[];
  },
  Context
> = {
  type: GraphQLUpdateTokenResult,
  description: "Update a new token.",
  args: {
    id: {
      type: new GraphQLNonNull(GraphQLID)
    },
    enabled: {
      type: GraphQLBoolean
    },
    scopes: {
      type: new GraphQLList(new GraphQLNonNull(GraphQLString))
    }
  },
  async resolve(source, args, context) {
    const { tx, token: t, realm } = context;

    if (!t) {
      return {
        success: false,
        message: "You must be authenticated to update a token.",
        token: null
      };
    }

    await tx.query("BEGIN DEFERRABLE");

    try {
      const before = await Token.read(tx, args.id);

      if (
        // can update tokens for all users
        !(await t.can(tx, `${realm}:token.*.*:write.basic`)) &&
        // can update tokens for users with equal access
        !(
          (await t.can(tx, `${realm}:token.equal.*:write.basic`)) &&
          isSuperset(
            await (await t.user(tx)).access(tx),
            await (await User.read(tx, args.userId)).access(tx)
          )
        ) &&
        // can update tokens for users with lesser access
        !(
          (await t.can(tx, `${realm}:token.equal.lesser:write.basic`)) &&
          isStrictSuperset(
            await (await t.user(tx)).access(tx),
            await (await before.user(tx)).access(tx)
          )
        ) &&
        // can update tokens for self
        !(
          (await t.can(tx, `${realm}:token.equal.self:write.basic`)) &&
          before.userId === t.userId
        )
      ) {
        await tx.query("ROLLBACK");
        return {
          success: false,
          message: "You do not have permission to update a token.",
          token: null
        };
      }

      if (
        args.scopes &&
        // can update tokens for all users
        !(await t.can(tx, `${realm}:token.*.*:write.scopes`)) &&
        // can update tokens for users with equal access
        !(
          (await t.can(tx, `${realm}:token.equal.*:write.scopes`)) &&
          isSuperset(
            await (await t.user(tx)).access(tx),
            await (await User.read(tx, before.id)).access(tx)
          )
        ) &&
        // can update tokens for users with lesser access
        !(
          (await t.can(tx, `${realm}:token.equal.lesser:write.scopes`)) &&
          isStrictSuperset(
            await (await t.user(tx)).access(tx),
            await (await before.user(tx)).access(tx)
          )
        ) &&
        // can update tokens for self
        !(
          (await t.can(tx, `${realm}:token.equal.self:write.scopes`)) &&
          before.userId === t.userId
        )
      ) {
        await tx.query("ROLLBACK");
        return {
          success: false,
          message: "You do not have permission to update a token.",
          token: null
        };
      }

      const token = await Token.write(
        tx,
        {
          ...before,
          enabled:
            typeof args.enabled === "boolean" ? args.enabled : before.enabled,
          scopes: args.scopes || before.scopes
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
