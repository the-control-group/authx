import {
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
    offset: null | number;
    limit: null | number;
  },
  Context
> = {
  type: new GraphQLList(new GraphQLNonNull(GraphQLUser)),
  description: "List all users.",
  args: {
    offset: {
      type: GraphQLInt
    },
    limit: {
      type: GraphQLInt
    }
  },
  async resolve(source, args, context) {
    const { tx, token, realm } = context;

    // can view all users
    if (token && (await token.can(tx, `${realm}:user.*:read`))) {
      const ids = await tx.query(
        `
        SELECT entity_id AS id
        FROM authx.user_record
        WHERE
          replacement_record_id IS NULL
          AND enabled = true
        `
      );

      if (!ids.rows.length) {
        return [];
      }

      return User.read(tx, ids.rows.map(({ id }) => id));
    }

    // can only view self
    if (token && (await token.can(tx, `${realm}:user.self:read`))) {
      const grant = await token.grant(tx);
      const user = await grant.user(tx);
      return [user];
    }

    return [];
  }
};
