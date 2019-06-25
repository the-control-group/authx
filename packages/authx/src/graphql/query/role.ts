import { GraphQLFieldConfig, GraphQLID, GraphQLNonNull } from "graphql";
import { Context } from "../../Context";
import { GraphQLRole } from "../GraphQLRole";
import { Role } from "../../model";

export const role: GraphQLFieldConfig<
  any,
  {
    id: string;
  },
  Context
> = {
  type: GraphQLRole,
  description: "Fetch a role by ID.",
  args: {
    id: {
      type: new GraphQLNonNull(GraphQLID)
    }
  },
  async resolve(source, args, context): Promise<null | Role> {
    const { pool, authorization: a, realm } = context;
    if (!a) return null;

    const tx = await pool.connect();
    try {
      const role = await Role.read(tx, args.id);
      return (await role.isAccessibleBy(realm, a, tx)) ? role : null;
    } finally {
      tx.release();
    }
  }
};
