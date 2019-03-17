import { GraphQLFieldConfig, GraphQLID, GraphQLNonNull } from "graphql";
import { Context } from "../Context";
import { GraphQLUser } from "../GraphQLUser";
import { Token } from "../../models";

export const viewer: GraphQLFieldConfig<any, {}, Context> = {
  type: GraphQLUser,
  description: "Fetch a user by ID.",
  args: {},
  async resolve(source, args, context): Promise<null | Token> {
    const { tx, token: t, realm } = context;
    return t && (await t.isAccessibleBy(realm, t, tx)) ? t : null;
  }
};
