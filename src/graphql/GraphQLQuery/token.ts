import { GraphQLFieldConfig, GraphQLID, GraphQLNonNull } from "graphql";
import { Context } from "../Context";
import { GraphQLToken } from "../GraphQLToken";
import { Token } from "../../models";

import { isSuperset, isStrictSuperset } from "scopeutils";

export const token: GraphQLFieldConfig<
  any,
  {
    id: string;
  },
  Context
> = {
  type: GraphQLToken,
  description: "Fetch a token by ID.",
  args: {
    id: {
      type: new GraphQLNonNull(GraphQLID)
    }
  },
  async resolve(source, args, context) {
    const { tx, token: t, realm } = context;

    // can view the tokens of all users
    if (t && (await t.can(tx, `${realm}:token.*.*:read.basic`))) {
      return Token.read(tx, args.id);
    }

    // can view the tokens of users with lesser or equal access
    if (t && (await t.can(tx, `${realm}:token.equal.*:read.basic`))) {
      const [token, user] = await Promise.all([
        Token.read(tx, args.id),
        await t.user(tx)
      ]);

      // self tokens are always equal
      if (token.userId === user.id) {
        return token;
      }

      // superset or equal
      if (
        isSuperset(
          await user.access(tx),
          await (await token.user(tx)).access(tx)
        )
      ) {
        return token;
      }

      return null;
    }

    // can view the tokens of users with lesser access
    if (t && (await t.can(tx, `${realm}:token.equal.lesser:read.basic`))) {
      const [token, user] = await Promise.all([
        Token.read(tx, args.id),
        await t.user(tx)
      ]);

      // check if it's possible to access self tokens
      if (
        token.userId === user.id &&
        (await t.can(tx, `${realm}:token.equal.self:read.basic`))
      ) {
        return token;
      }

      // strict superset
      if (
        isStrictSuperset(
          await user.access(tx),
          await (await token.user(tx)).access(tx)
        )
      ) {
        return token;
      }

      return null;
    }

    // can view own tokens
    if (t && (await t.can(tx, `${realm}:token.equal.self:read.basic`))) {
      const [token, user] = await Promise.all([
        Token.read(tx, args.id),
        t.user(tx)
      ]);

      if (token.userId === user.id) {
        return token;
      }
    }

    return null;
  }
};
