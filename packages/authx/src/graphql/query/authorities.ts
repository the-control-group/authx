import { GraphQLBoolean, GraphQLFieldConfig } from "graphql";
import { GraphQLAuthorityConnection } from "../GraphQLAuthorityConnection";
import { Context } from "../../Context";
import { Authority } from "../../model";

import {
  connectionFromArray,
  connectionArgs,
  ConnectionArguments
} from "graphql-relay";

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
      description: "Include disabled authorities in results."
    }
  },
  async resolve(source, args, context) {
    const { executor } = context;

    const ids = await executor.connection.query(
      `
      SELECT entity_id AS id
      FROM authx.authority_record
      WHERE
        replacement_record_id IS NULL
        ${args.includeDisabled ? "" : "AND enabled = true"}
      `
    );

    if (!ids.rows.length) {
      return [];
    }

    return connectionFromArray(
      await Authority.read(
        executor,
        ids.rows.map(({ id }) => id)
      ),
      args
    );
  }
};
