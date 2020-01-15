import { GraphQLFieldConfig, GraphQLID, GraphQLNonNull } from "graphql";
import { Context } from "../../Context";
import { GraphQLAuthority } from "../GraphQLAuthority";
import { Authority } from "../../model";

export const authority: GraphQLFieldConfig<
  any,
  Context,
  {
    id: string;
  }
> = {
  type: GraphQLAuthority,
  description: "Fetch an authority by ID.",
  args: {
    id: {
      type: new GraphQLNonNull(GraphQLID)
    }
  },
  async resolve(source, args, context): Promise<null | Authority<any>> {
    const {
      pool,
      strategies: { authorityMap }
    } = context;

    const tx = await pool.connect();
    try {
      return await Authority.read(tx, args.id, authorityMap);
    } finally {
      tx.release();
    }
  }
};
