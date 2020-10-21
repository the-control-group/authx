import { GraphQLBoolean, GraphQLFieldConfig } from "graphql";
import { GraphQLAuthorityConnection } from "../GraphQLAuthorityConnection";
import { Context } from "../../Context";
import { Authority } from "../../model";

import { connectionArgs, ConnectionArguments, Connection } from "graphql-relay";
import { CursorRule } from "../../model/rules/CursorRule";
import { NoReplacementRecord } from "../../model/rules/NoReplacementRecord";
import { FieldRule } from "../../model/rules/FieldRule";
import { Rule } from "../../model/rules/Rule";
import { CursorConnection } from "../connection/CursorConnection";

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
      args
    );

    if (!args.includeDisabled) rules.push(new FieldRule("enabled", true));

    const ids = await Rule.runQuery(
      executor,
      `
        SELECT entity_id AS id
        FROM authx.authority_record
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

    return CursorConnection.connectionFromRules(
      args,
      await Authority.read(
        executor,
        ids.rows.map(({ id }) => id)
      ),
      rules
    );
  },
};
