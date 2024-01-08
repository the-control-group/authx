import { GraphQLBoolean, GraphQLFieldConfig } from "graphql";

import { connectionArgs, ConnectionArguments, Connection } from "graphql-relay";

import { GraphQLAuthorizationConnection } from "../GraphQLAuthorizationConnection.js";
import { Context } from "../../Context.js";
import { Authorization } from "../../model/index.js";
import { CursorRule } from "../../model/rules/CursorRule.js";
import { NoReplacementRecord } from "../../model/rules/NoReplacementRecord.js";
import { IsAccessibleByRule } from "../../model/rules/IsAccessibleByRule.js";
import { FieldRule } from "../../model/rules/FieldRule.js";
import { Rule } from "../../model/rules/Rule.js";
import { CursorConnection } from "../connection/CursorConnection.js";

export const authorizations: GraphQLFieldConfig<
  any,
  Context,
  ConnectionArguments & {
    includeDisabled: boolean;
  }
> = {
  type: GraphQLAuthorizationConnection,
  description: "List all authorizations.",
  args: {
    ...connectionArgs,
    includeDisabled: {
      type: GraphQLBoolean,
      defaultValue: false,
      description: "Include disabled authorities in results.",
    },
  },
  async resolve(source, args, context): Promise<Connection<Authorization>> {
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
        new IsAccessibleByRule(
          realm,
          await a.access(executor, realm),
          "authorization"
        ),
      ],
      args
    );

    if (!args.includeDisabled) rules.push(new FieldRule("enabled", true));

    const ids = await Rule.runQuery(
      executor,
      `
        SELECT entity_id AS id
        FROM authx.authorization_record
        `,
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

    const authorizations = await Authorization.read(
      executor,
      ids.rows.map(({ id }) => id)
    );

    return CursorConnection.connectionFromRules(args, authorizations, rules);
  },
};
