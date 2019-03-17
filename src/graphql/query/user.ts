import { GraphQLFieldConfig, GraphQLID, GraphQLNonNull } from "graphql";
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
  async resolve(source, args, context) {
    const { tx, token: t, realm } = context;

    // can view all users
    if (t && (await t.can(tx, `${realm}:user.*:read.basic`))) {
      return User.read(tx, args.id);
    }

    // can only view self
    if (
      t &&
      t.userId === args.id &&
      (await t.can(tx, `${realm}:user.self:read.basic`))
    ) {
      return User.read(tx, args.id);
    }

    return null;
  }
};
