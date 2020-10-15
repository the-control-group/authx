import { GraphQLBoolean, GraphQLFieldConfig } from "graphql";

import { connectionArgs, ConnectionArguments } from "graphql-relay";

import { GraphQLClientConnection } from "../GraphQLClientConnection";
import { Context } from "../../Context";
import { Client } from "../../model";
import { CursorRule } from "../../model/rules/CursorRule";
import { NoReplacementRecord } from "../../model/rules/NoReplacementRecord";
import { IsAccessibleByRule } from "../../model/rules/IsAccessibleByRule";
import { FieldRule } from "../../model/rules/FieldRule";
import { Rule } from "../../model/rules/Rule";
import { CursorConnection } from "../connection/CursorConnection";

export const clients: GraphQLFieldConfig<
  any,
  Context,
  ConnectionArguments & {
    includeDisabled: boolean;
  }
> = {
  type: GraphQLClientConnection,
  description: "List all clients.",
  args: {
    ...connectionArgs,
    includeDisabled: {
      type: GraphQLBoolean,
      defaultValue: false,
      description: "Include disabled clients in results.",
    },
  },
  async resolve(source, args, context) {
    const { executor, authorization: a, realm } = context;
    if (!a) return [];

    const rules = CursorRule.addToRuleListIfNeeded(
      [
        new NoReplacementRecord(),
        new IsAccessibleByRule(
          realm,
          await a.access(executor, realm),
          "client"
        ),
      ],
      args
    );

    if (!args.includeDisabled) rules.push(new FieldRule("enabled", true));

    const ids = await Rule.runQuery(
      executor,
      `
        SELECT entity_id AS id
        FROM authx.client_record
        `,
      rules
    );

    if (!ids.rows.length) {
      return [];
    }

    const clients = await Client.read(
      executor,
      ids.rows.map(({ id }) => id)
    );

    return CursorConnection.connectionFromRules(args, clients, rules);
  },
};
