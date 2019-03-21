import v4 from "uuid/v4";
import { randomBytes } from "crypto";
import { isSuperset, isStrictSuperset } from "scopeutils";
import {
  GraphQLBoolean,
  GraphQLFieldConfig,
  GraphQLID,
  GraphQLList,
  GraphQLNonNull,
  GraphQLString
} from "graphql";

import { Context } from "../Context";
import { GraphQLToken } from "../GraphQLToken";
import { Token, User } from "../../model";
import { ForbiddenError } from "../../errors";

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
  type: GraphQLToken,
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
  async resolve(source, args, context): Promise<Token> {
    const { tx, token: t, realm } = context;

    if (!t) {
      throw new ForbiddenError("You must be authenticated to create a token.");
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
      throw new ForbiddenError("You must be authenticated to create a token.");
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
          secret: randomBytes(16).toString("hex"),
          scopes: args.scopes
        },
        {
          recordId: v4(),
          createdByTokenId: t.id,
          createdByCredentialId: null,
          createdAt: new Date()
        }
      );

      await tx.query("COMMIT");
      return token;
    } catch (error) {
      await tx.query("ROLLBACK");
      throw error;
    }
  }
};
