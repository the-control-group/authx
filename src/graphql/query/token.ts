import { GraphQLFieldConfig, GraphQLID, GraphQLNonNull } from "graphql";
import { Context } from "../Context";
import { GraphQLToken } from "../GraphQLToken";
import { Token } from "../../models";

import { isSuperset, isStrictSuperset } from "scopeutils";

export const token: GraphQLFieldConfig<
  any,
  {
    id: string;
  },
  Context
> = {
  type: GraphQLToken,
  description: "Fetch a token by ID.",
  args: {
    id: {
      type: new GraphQLNonNull(GraphQLID)
    }
  },
  async resolve(source, args, context): Promise<null | Token> {
    const { tx, token: t, realm } = context;
    if (!t) return null;

    const token = await Token.read(tx, args.id);
    return (await token.isAccessibleBy(realm, t, tx)) ? token : null;
  }
};
