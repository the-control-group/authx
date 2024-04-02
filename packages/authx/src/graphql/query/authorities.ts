import { GraphQLBoolean, GraphQLFieldConfig } from "graphql";
import { GraphQLAuthorityConnection } from "../GraphQLAuthorityConnection.js";
import { Context } from "../../Context.js";
import { Authority } from "../../model/index.js";

import { connectionArgs, ConnectionArguments, Connection } from "graphql-relay";
import { CursorRule } from "../../model/rules/CursorRule.js";
import { NoReplacementRecord } from "../../model/rules/NoReplacementRecord.js";
import { FieldRule } from "../../model/rules/FieldRule.js";
import { Rule } from "../../model/rules/Rule.js";
import { CursorConnection } from "../connection/CursorConnection.js";

export const authorities: GraphQLFieldConfig<
  any,
  Context,
  ConnectionArguments & {
    includeDisabled: boolean;
  }
> = {
  type: GraphQLAuthorityConnection,
  description: "List all authorities.",
  args: {
    ...connectionArgs,
    includeDisabled: {
      type: GraphQLBoolean,
      defaultValue: false,
      description: "Include disabled authorities in results.",
    },
  },
  async resolve(source, args, context): Promise<Connection<Authority<any>>> {
    const { executor } = context;

    const rules = CursorRule.addToRuleListIfNeeded(
      [new NoReplacementRecord()],
      args,
    );

    if (!args.includeDisabled) rules.push(new FieldRule("enabled", true));

    const ids = await Rule.runQuery(
      executor,
      `
        SELECT entity_id AS id
        FROM authx.authority_record
        `,
      rules,
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

    return CursorConnection.connectionFromRules(
      args,
      await Authority.read(
        executor,
        ids.rows.map(({ id }) => id),
      ),
      rules,
    );
  },
};
