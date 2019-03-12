import {
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
    offset: null | number;
    limit: null | number;
  },
  Context
> = {
  type: new GraphQLList(new GraphQLNonNull(GraphQLAuthority)),
  description: "List all authorities.",
  args: {
    offset: {
      type: GraphQLInt
    },
    limit: {
      type: GraphQLInt
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
          AND enabled = true
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
