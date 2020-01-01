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
      authorization: a,
      realm,
      strategies: { authorityMap }
    } = context;
    if (!a) return null;

    const tx = await pool.connect();
    try {
      const authority = await Authority.read(tx, args.id, authorityMap);
      return (await authority.isAccessibleBy(realm, a, tx)) ? authority : null;
    } finally {
      tx.release();
    }
  }
};
