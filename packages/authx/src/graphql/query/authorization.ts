import { GraphQLFieldConfig, GraphQLID, GraphQLNonNull } from "graphql";
import { Context } from "../../Context";
import { GraphQLAuthorization } from "../GraphQLAuthorization";
import { Authorization } from "../../model";

export const authorization: GraphQLFieldConfig<
  any,
  {
    id: string;
  },
  Context
> = {
  type: GraphQLAuthorization,
  description: "Fetch a authorization by ID.",
  args: {
    id: {
      type: new GraphQLNonNull(GraphQLID)
    }
  },
  async resolve(source, args, context): Promise<null | Authorization> {
    const { pool, authorization: a, realm } = context;
    if (!a) return null;

    const tx = await pool.connect();
    try {
      const authorization = await Authorization.read(tx, args.id);
      return (await authorization.isAccessibleBy(realm, a, tx))
        ? authorization
        : null;
    } finally {
      tx.release();
    }
  }
};
