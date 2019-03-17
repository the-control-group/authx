import {
  GraphQLBoolean,
  GraphQLInt,
  GraphQLList,
  GraphQLNonNull,
  GraphQLFieldConfig
} from "graphql";
import { GraphQLUser } from "../GraphQLUser";
import { Context } from "../Context";
import { User } from "../../models";

export const users: GraphQLFieldConfig<
  any,
  {
    includeDisabled: boolean;
    offset: null | number;
    limit: null | number;
  },
  Context
> = {
  type: new GraphQLList(new GraphQLNonNull(GraphQLUser)),
  description: "List all users.",
  args: {
    includeDisabled: {
      type: GraphQLBoolean,
      defaultValue: false,
      description: "Include disabled users in results."
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
    const { tx, token: t, realm } = context;

    // can view all users
    if (t && (await t.can(tx, `${realm}:user.*:read.basic`))) {
      const ids = await tx.query(
        `
        SELECT entity_id AS id
        FROM authx.user_record
        WHERE
          replacement_record_id IS NULL
          ${args.includeDisabled ? "" : "AND enabled = true"}
        `
      );

      if (!ids.rows.length) {
        return [];
      }

      return User.read(tx, ids.rows.map(({ id }) => id));
    }

    // can only view self
    if (t && (await t.can(tx, `${realm}:user.self:read.basic`))) {
      return [await t.user(tx)];
    }

    return [];
  }
};
