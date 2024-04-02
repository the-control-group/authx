import { GraphQLFieldConfig } from "graphql";
import { Context } from "../../Context.js";
import { GraphQLAuthorization } from "../GraphQLAuthorization.js";
import { Authorization } from "../../model/index.js";

export const viewer: GraphQLFieldConfig<
  any,
  Context,
  { [key: string]: unknown }
> = {
  type: GraphQLAuthorization,
  description: "Returns the current authorization.",
  args: {},
  async resolve(source, args, context): Promise<null | Authorization> {
    const { executor, authorization: a, realm } = context;
    return a && (await a.isAccessibleBy(realm, a, executor)) ? a : null;
  },
};
