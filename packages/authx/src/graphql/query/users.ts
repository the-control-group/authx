import { GraphQLBoolean, GraphQLFieldConfig } from "graphql";

import { connectionArgs, ConnectionArguments, Connection } from "graphql-relay";

import { GraphQLUserConnection } from "../GraphQLUserConnection.js";
import { Context } from "../../Context.js";
import { User } from "../../model/index.js";
import { Rule } from "../../model/rules/Rule.js";
import { NoReplacementRecord } from "../../model/rules/NoReplacementRecord.js";
import { FieldRule } from "../../model/rules/FieldRule.js";
import { IsAccessibleByRule } from "../../model/rules/IsAccessibleByRule.js";
import { CursorRule } from "../../model/rules/CursorRule.js";
import { CursorConnection } from "../connection/CursorConnection.js";

export const users: GraphQLFieldConfig<
  any,
  Context,
  ConnectionArguments & {
    includeDisabled: boolean;
  }
> = {
  type: GraphQLUserConnection,
  description: "List all users.",
  args: {
    ...connectionArgs,
    includeDisabled: {
      type: GraphQLBoolean,
      defaultValue: false,
      description: "Include disabled users in results.",
    },
  },
  async resolve(source, args, context): Promise<Connection<User>> {
    const { executor, authorization: a, realm } = context;
    if (!a) {
      return {
        pageInfo: {
          startCursor: null,
          endCursor: null,
          hasPreviousPage: false,
          hasNextPage: false,
        },
        edges: [],
      };
    }

    const rules = CursorRule.addToRuleListIfNeeded(
      [
        new NoReplacementRecord(),
        new IsAccessibleByRule(realm, await a.access(executor, realm), "user"),
      ],
      args
    );

    if (!args.includeDisabled) rules.push(new FieldRule("enabled", true));

    const ids = await Rule.runQuery(
      executor,
      `
        SELECT entity_id AS id
        FROM authx.user_record`,
      rules
    );

    if (!ids.rows.length) {
      return {
        pageInfo: {
          startCursor: null,
          endCursor: null,
          hasPreviousPage: false,
          hasNextPage: false,
        },
        edges: [],
      };
    }

    const users = await User.read(
      executor,
      ids.rows.map(({ id }) => id)
    );

    return CursorConnection.connectionFromRules(args, users, rules);
  },
};
