import {
  GraphQLBoolean,
  GraphQLInt,
  GraphQLList,
  GraphQLNonNull,
  GraphQLFieldConfig
} from "graphql";
import { GraphQLToken } from "../GraphQLToken";
import { Context } from "../Context";
import { Token } from "../../models";
import { isSuperset, isStrictSuperset } from "scopeutils";
import { filter } from "../../util/filter";

export const tokens: GraphQLFieldConfig<
  any,
  {
    includeDisabled: boolean;
    offset: null | number;
    limit: null | number;
  },
  Context
> = {
  type: new GraphQLList(new GraphQLNonNull(GraphQLToken)),
  description: "List all tokens.",
  args: {
    includeDisabled: {
      type: GraphQLBoolean,
      defaultValue: false,
      description: "Include disabled tokens in results."
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
  async resolve(source, args, context): Promise<Token[]> {
    const { tx, token: t, realm } = context;
    if (!t) return [];

    const ids = await tx.query(
      `
        SELECT entity_id AS id
        FROM authx.token_record
        WHERE
          replacement_record_id IS NULL
          ${args.includeDisabled ? "" : "AND enabled = true"}
        `
    );

    if (!ids.rows.length) {
      return [];
    }

    const tokens = await Token.read(tx, ids.rows.map(({ id }) => id));
    return filter(tokens, token => token.isAccessibleBy(realm, t, tx));
  }
};
