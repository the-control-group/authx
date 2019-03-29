import { GraphQLFieldConfig } from "graphql";
import { Context } from "../Context";
import { GraphQLToken } from "../GraphQLToken";
import { Token } from "../../model";

export const viewer: GraphQLFieldConfig<any, {}, Context> = {
  type: GraphQLToken,
  description: "Fetch a user by ID.",
  args: {},
  async resolve(source, args, context): Promise<null | Token> {
    const { tx, token: t, realm } = context;
    return t && (await t.isAccessibleBy(realm, t, tx)) ? t : null;
  }
};