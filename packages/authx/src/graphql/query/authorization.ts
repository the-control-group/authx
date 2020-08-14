import { GraphQLFieldConfig, GraphQLID, GraphQLNonNull } from "graphql";
import { Context } from "../../Context";
import { GraphQLAuthorization } from "../GraphQLAuthorization";
import { Authorization } from "../../model";

export const authorization: GraphQLFieldConfig<
  any,
  Context,
  {
    id: string;
  }
> = {
  type: GraphQLAuthorization,
  description: "Fetch a authorization by ID.",
  args: {
    id: {
      type: new GraphQLNonNull(GraphQLID)
    }
  },
  async resolve(source, args, context): Promise<null | Authorization> {
    const { executor, authorization: a, realm } = context;
    if (!a) return null;

    const authorization = await Authorization.read(executor, args.id);
    return (await authorization.isAccessibleBy(realm, a, executor))
      ? authorization
      : null;
  }
};
