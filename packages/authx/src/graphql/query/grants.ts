import { GraphQLBoolean, GraphQLFieldConfig } from "graphql";

import { connectionArgs, ConnectionArguments } from "graphql-relay";

import { GraphQLGrantConnection } from "../GraphQLGrantConnection";
import { Context } from "../../Context";
import { Grant } from "../../model";
import { CursorRule } from "../../model/rules/CursorRule";
import { NoReplacementRecord } from "../../model/rules/NoReplacementRecord";
import { IsAccessibleByRule } from "../../model/rules/IsAccessibleByRule";
import { FieldRule } from "../../model/rules/FieldRule";
import { Rule } from "../../model/rules/Rule";
import { CursorConnection } from "../connection/CursorConnection";

export const grants: GraphQLFieldConfig<
  any,
  Context,
  ConnectionArguments & {
    includeDisabled: boolean;
  }
> = {
  type: GraphQLGrantConnection,
  description: "List all grants.",
  args: {
    ...connectionArgs,
    includeDisabled: {
      type: GraphQLBoolean,
      defaultValue: false,
      description: "Include disabled grants in results."
    }
  },
  async resolve(source, args, context) {
    const { executor, authorization: a, realm } = context;
    if (!a) return [];

    const rules = CursorRule.addToRuleListIfNeeded(
      [new NoReplacementRecord(), new IsAccessibleByRule(realm, a, "grant")],
      args
    );

    if (!args.includeDisabled) rules.push(new FieldRule("enabled", true));

    const ids = await Rule.runQuery(
      executor,
      `
        SELECT entity_id AS id
        FROM authx.grant_record
        `,
      rules
    );

    if (!ids.rows.length) {
      return [];
    }

    const grants = await Grant.read(
      executor,
      ids.rows.map(({ id }) => id)
    );

    return CursorConnection.connectionFromRules(args, grants, rules);
  }
};
