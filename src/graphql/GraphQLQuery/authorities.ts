import {
  GraphQLBoolean,
  GraphQLInt,
  GraphQLList,
  GraphQLNonNull,
  GraphQLFieldConfig
} from "graphql";
import { GraphQLAuthority } from "../GraphQLAuthority";
import { Context } from "../Context";
import { Authority } from "../../models";

export const authorities: GraphQLFieldConfig<
  any,
  {
    includeDisabled: boolean;
    offset: null | number;
    limit: null | number;
  },
  Context
> = {
  type: new GraphQLList(new GraphQLNonNull(GraphQLAuthority)),
  description: "List all authorities.",
  args: {
    includeDisabled: {
      type: GraphQLBoolean,
      defaultValue: false,
      description: "Include disabled authorities in results."
    },
    offset: {
      type: GraphQLInt,
      description: "The number of results to skip."
    },
    limit: {
      type: GraphQLInt,
      description: "The maximum number of results to return."
    }
  },
  async resolve(source, args, context) {
    const { tx, token, realm, authorityMap } = context;

    // can view all authorities
    if (token && (await token.can(tx, `${realm}:authority.*:read`))) {
      const ids = await tx.query(
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

      return Authority.read(tx, ids.rows.map(({ id }) => id), authorityMap);
    }

    return [];
  }
};
