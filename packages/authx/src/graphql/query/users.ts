import { GraphQLBoolean, GraphQLFieldConfig } from "graphql";

import { connectionArgs, ConnectionArguments } from "graphql-relay";

import { GraphQLUserConnection } from "../GraphQLUserConnection";
import { Context } from "../../Context";
import { User } from "../../model";
import { Rule } from "../../model/rules/Rule";
import { NoReplacementRecord } from "../../model/rules/NoReplacementRecord";
import { FieldRule } from "../../model/rules/FieldRule";
import { IsAccessibleByRule } from "../../model/rules/IsAccessibleByRule";
import { CursorRule } from "../../model/rules/CursorRule";
import { CursorConnection } from "../connection/CursorConnection";

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
  async resolve(source, args, context) {
    const { executor, authorization: a, realm } = context;
    if (!a) return [];

    const rules = CursorRule.addToRuleListIfNeeded(
      [new NoReplacementRecord(), new IsAccessibleByRule(realm, a, "user")],
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
      return [];
    }

    const users = await User.read(
      executor,
      ids.rows.map(({ id }) => id)
    );

    return CursorConnection.connectionFromRules(args, users, rules);
  },
};
