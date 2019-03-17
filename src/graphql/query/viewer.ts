import { GraphQLFieldConfig, GraphQLID, GraphQLNonNull } from "graphql";
import { Context } from "../Context";
import { GraphQLUser } from "../GraphQLUser";
import { User } from "../../models";

export const viewer: GraphQLFieldConfig<any, {}, Context> = {
  type: GraphQLUser,
  description: "Fetch a user by ID.",
  args: {},
  async resolve(source, args, context): Promise<null | User> {
    const { tx, token: t, realm } = context;

    // can only view self
    if (t && (await t.can(tx, `${realm}:user.self:read.basic`))) {
      return t.user(tx);
    }

    return null;
  }
};
