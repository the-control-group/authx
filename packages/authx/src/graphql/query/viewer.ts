import { GraphQLFieldConfig } from "graphql";
import { Context } from "../../Context";
import { GraphQLAuthorization } from "../GraphQLAuthorization";
import { Authorization } from "../../model";

export const viewer: GraphQLFieldConfig<any, {}, Context> = {
  type: GraphQLAuthorization,
  description: "Fetch a user by ID.",
  args: {},
  async resolve(source, args, context): Promise<null | Authorization> {
    const { tx, authorization: a, realm } = context;
    return a && (await a.isAccessibleBy(realm, a, tx)) ? a : null;
  }
};
