import {
  GraphQLBoolean,
  GraphQLInt,
  GraphQLList,
  GraphQLNonNull,
  GraphQLFieldConfig
} from "graphql";

import {
  connectionFromArray,
  connectionArgs,
  ConnectionArguments
} from "graphql-relay";

import { GraphQLAuthorization } from "../GraphQLAuthorization";
import { Context } from "../../Context";
import { Authorization } from "../../model";
import { filter } from "../../util/filter";

export const authorizations: GraphQLFieldConfig<
  any,
  ConnectionArguments & {
    includeDisabled: boolean;
  },
  Context
> = {
  type: new GraphQLList(new GraphQLNonNull(GraphQLAuthorization)),
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
    const { tx, authorization: a, realm } = context;
    if (!a) return [];

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
  }
};
