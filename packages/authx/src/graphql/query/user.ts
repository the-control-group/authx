import { GraphQLFieldConfig, GraphQLID, GraphQLNonNull } from "graphql";
import { Context } from "../../Context";
import { GraphQLUser } from "../GraphQLUser";
import { User } from "../../model";

export const user: GraphQLFieldConfig<
  any,
  Context,
  {
    id: string;
  }
> = {
  type: GraphQLUser,
  description: "Fetch a user by ID.",
  args: {
    id: {
      type: new GraphQLNonNull(GraphQLID),
    },
  },
  async resolve(source, args, context): Promise<null | User> {
    const { executor, authorization: a, realm } = context;
    if (!a) return null;

    const user = await User.read(executor, args.id);
    return (await user.isAccessibleBy(realm, a, executor)) ? user : null;
  },
};
