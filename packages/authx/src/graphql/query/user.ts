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
      type: new GraphQLNonNull(GraphQLID)
    }
  },
  async resolve(source, args, context): Promise<null | User> {
    const { pool, authorization: a, realm } = context;
    if (!a) return null;

    const tx = await pool.connect();
    try {
      const user = await User.read(tx, args.id);
      return (await user.isAccessibleBy(realm, a, tx)) ? user : null;
    } finally {
      tx.release();
    }
  }
};
