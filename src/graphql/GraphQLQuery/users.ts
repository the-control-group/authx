import { GraphQLInt, GraphQLFieldConfig } from "graphql";
import { GraphQLUser } from "../GraphQLUser";
import { Context } from "../Context";

export const users: GraphQLFieldConfig<
  any,
  {
    offset: null | number;
    limit: null | number;
  },
  Context
> = {
  type: GraphQLUser,
  description: "List all users.",
  args: {
    offset: {
      type: GraphQLInt
    },
    limit: {
      type: GraphQLInt
    }
  },
  async resolve(source, args, context, info) {
    const { tx, token, realm } = context;

    // can view all users
    if (token && (await token.can(tx, `${realm}:user:read`))) {
      return []; // TODO: query all
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
