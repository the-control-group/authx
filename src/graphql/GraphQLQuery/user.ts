import {
  GraphQLFieldConfig,
  GraphQLID,
  GraphQLNonNull,
  GraphQLString
} from "graphql";
import { Context } from "../Context";
import { GraphQLUser } from "../GraphQLUser";
import { User } from "../../models";

export const user: GraphQLFieldConfig<
  any,
  {
    id: string;
  },
  Context
> = {
  type: GraphQLUser,
  description: "Fetch a user by ID.",
  args: {
    id: {
      type: new GraphQLNonNull(GraphQLID)
    }
  },
  async resolve(source, args, context, info) {
    const { tx, token, realm } = context;

    // can view all users
    if (token && (await token.can(tx, `${realm}:user:read`))) {
      return User.read(tx, args.id);
    }

    // can only view self
    if (
      token &&
      (await token.can(tx, `${realm}:user.self:read`)) &&
      (await token.grant(tx)).userId === args.id
    ) {
      return User.read(tx, args.id);
    }

    return null;
  }
};
