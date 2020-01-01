import { GraphQLBoolean, GraphQLFieldConfig } from "graphql";

import {
  connectionFromArray,
  connectionArgs,
  ConnectionArguments
} from "graphql-relay";

import { GraphQLAuthorizationConnection } from "../GraphQLAuthorizationConnection";
import { Context } from "../../Context";
import { Authorization } from "../../model";
import { filter } from "../../util/filter";

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
      description: "Include disabled authorities in results."
    }
  },
  async resolve(source, args, context) {
    const { pool, authorization: a, realm } = context;
    if (!a) return [];

    const tx = await pool.connect();
    try {
      const ids = await tx.query(
        `
        SELECT entity_id AS id
        FROM authx.authorization_record
        WHERE
          replacement_record_id IS NULL
          ${args.includeDisabled ? "" : "AND enabled = true"}
        `
      );

      if (!ids.rows.length) {
        return [];
      }

      const authorizations = await Authorization.read(
        tx,
        ids.rows.map(({ id }) => id)
      );

      return connectionFromArray(
        await filter(authorizations, authorization =>
          authorization.isAccessibleBy(realm, a, tx)
        ),
        args
      );
    } finally {
      tx.release();
    }
  }
};
