import { GraphQLBoolean, GraphQLFieldConfig } from "graphql";

import { connectionArgs, ConnectionArguments, Connection } from "graphql-relay";

import { GraphQLCredentialConnection } from "../GraphQLCredentialConnection.js";
import { Context } from "../../Context.js";
import { Credential } from "../../model/index.js";
import { CursorRule } from "../../model/rules/CursorRule.js";
import { NoReplacementRecord } from "../../model/rules/NoReplacementRecord.js";
import { IsAccessibleByRule } from "../../model/rules/IsAccessibleByRule.js";
import { FieldRule } from "../../model/rules/FieldRule.js";
import { Rule } from "../../model/rules/Rule.js";
import { CursorConnection } from "../connection/CursorConnection.js";

export const credentials: GraphQLFieldConfig<
  any,
  Context,
  ConnectionArguments & {
    includeDisabled: boolean;
  }
> = {
  type: GraphQLCredentialConnection,
  description: "List all credentials.",
  args: {
    ...connectionArgs,
    includeDisabled: {
      type: GraphQLBoolean,
      defaultValue: false,
      description: "Include disabled credentials in results.",
    },
  },
  async resolve(source, args, context): Promise<Connection<Credential<any>>> {
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
          "credential"
        ),
      ],
      args
    );

    if (!args.includeDisabled) rules.push(new FieldRule("enabled", true));

    const ids = await Rule.runQuery(
      executor,
      `
        SELECT entity_id AS id
        FROM authx.credential_record
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

    const credentials = await Credential.read(
      executor,
      ids.rows.map(({ id }) => id)
    );

    return CursorConnection.connectionFromRules(args, credentials, rules);
  },
};
