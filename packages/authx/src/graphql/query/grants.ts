import {
  GraphQLBoolean,
  GraphQLList,
  GraphQLNonNull,
  GraphQLFieldConfig
} from "graphql";

import {
  connectionFromArray,
  connectionArgs,
  ConnectionArguments
} from "graphql-relay";

import { GraphQLGrant } from "../GraphQLGrant";
import { Context } from "../../Context";
import { Grant } from "../../model";
import { filter } from "../../util/filter";

export const grants: GraphQLFieldConfig<
  any,
  ConnectionArguments & {
    includeDisabled: boolean;
  },
  Context
> = {
  type: new GraphQLList(new GraphQLNonNull(GraphQLGrant)),
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
    const { tx, authorization: a, realm } = context;
    if (!a) return [];

    const ids = await tx.query(
      `
        SELECT entity_id AS id
        FROM authx.grant_record
        WHERE
          replacement_record_id IS NULL
          ${args.includeDisabled ? "" : "AND enabled = true"}
        `
    );

    if (!ids.rows.length) {
      return [];
    }

    const grants = await Grant.read(tx, ids.rows.map(({ id }) => id));

    return connectionFromArray(
      await filter(grants, grant => grant.isAccessibleBy(realm, a, tx)),
      args
    );
  }
};
