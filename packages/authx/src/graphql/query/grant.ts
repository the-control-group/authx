import { GraphQLFieldConfig, GraphQLID, GraphQLNonNull } from "graphql";
import { Context } from "../../Context";
import { GraphQLGrant } from "../GraphQLGrant";
import { Grant } from "../../model";

export const grant: GraphQLFieldConfig<
  any,
  Context,
  {
    id: string;
  }
> = {
  type: GraphQLGrant,
  description: "Fetch a grant by ID.",
  args: {
    id: {
      type: new GraphQLNonNull(GraphQLID)
    }
  },
  async resolve(source, args, context): Promise<null | Grant> {
    const { pool, authorization: a, realm } = context;
    if (!a) return null;

    const tx = await pool.connect();
    try {
      const grant = await Grant.read(tx, args.id);
      return (await grant.isAccessibleBy(realm, a, tx)) ? grant : null;
    } finally {
      tx.release();
    }
  }
};
