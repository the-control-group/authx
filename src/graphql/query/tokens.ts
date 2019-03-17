import {
  GraphQLBoolean,
  GraphQLInt,
  GraphQLList,
  GraphQLNonNull,
  GraphQLFieldConfig
} from "graphql";
import { GraphQLToken } from "../GraphQLToken";
import { Context } from "../Context";
import { Token } from "../../models";
import { isSuperset, isStrictSuperset } from "scopeutils";

export const tokens: GraphQLFieldConfig<
  any,
  {
    includeDisabled: boolean;
    offset: null | number;
    limit: null | number;
  },
  Context
> = {
  type: new GraphQLList(new GraphQLNonNull(GraphQLToken)),
  description: "List all tokens.",
  args: {
    includeDisabled: {
      type: GraphQLBoolean,
      defaultValue: false,
      description: "Include disabled tokens in results."
    },
    offset: {
      type: GraphQLInt,
      description: "The number of results to skip."
    },
    limit: {
      type: GraphQLInt,
      description: "The maximum number of results to return."
    }
  },
  async resolve(source, args, context) {
    const { tx, token: t, realm } = context;

    async function fetch(): Promise<Token[]> {
      const ids = await tx.query(
        `
        SELECT entity_id AS id
        FROM authx.token_record
        WHERE
          replacement_record_id IS NULL
          ${args.includeDisabled ? "" : "AND enabled = true"}
        `
      );

      if (!ids.rows.length) {
        return [];
      }

      return Token.read(tx, ids.rows.map(({ id }) => id));
    }

    // can view the tokens of all users
    if (t && (await t.can(tx, `${realm}:token.*.*:read.basic`))) {
      return fetch();
    }

    // can view the tokens of users with lesser or equal access
    if (t && (await t.can(tx, `${realm}:token.equal.*:read.basic`))) {
      const [tokens, user] = await Promise.all([fetch(), await t.user(tx)]);

      const access = await user.access(tx);

      return (await Promise.all(
        tokens.map(async token => {
          return {
            token,
            access: await (await token.user(tx)).access(tx)
          };
        })
      ))
        .filter(
          row => row.token.userId === user.id || isSuperset(access, row.access)
        )
        .map(({ token }) => token);
    }

    // can view the tokens of users with lesser access
    if (t && (await t.can(tx, `${realm}:token.equal.lesser:read.basic`))) {
      const [tokens, user] = await Promise.all([fetch(), await t.user(tx)]);

      const access = await user.access(tx);
      const canAccessSelf = await t.can(
        tx,
        `${realm}:token.equal.self:read.basic`
      );

      return (await Promise.all(
        tokens.map(async token => {
          return {
            token,
            access: await (await token.user(tx)).access(tx)
          };
        })
      ))
        .filter(
          row =>
            (row.token.userId === user.id && canAccessSelf) ||
            isStrictSuperset(access, row.access)
        )
        .map(({ token }) => token);
    }

    // can view own tokens
    if (t && (await t.can(tx, `${realm}:token.equal.self:read.basic`))) {
      const user = await t.user(tx);

      const ids = await tx.query(
        `
        SELECT entity_id AS id
        FROM authx.token_record
        WHERE
          replacement_record_id IS NULL
          ${args.includeDisabled ? "" : "AND enabled = true"}
          AND user_id = $1
        `,
        [user.id]
      );

      if (!ids.rows.length) {
        return [];
      }

      return Token.read(tx, ids.rows.map(({ id }) => id));
    }

    return [];
  }
};
