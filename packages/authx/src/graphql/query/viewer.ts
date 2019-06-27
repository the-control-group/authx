import { GraphQLFieldConfig } from "graphql";
import { Context } from "../../Context";
import { GraphQLAuthorization } from "../GraphQLAuthorization";
import { Authorization } from "../../model";

export const viewer: GraphQLFieldConfig<any, {}, Context> = {
  type: GraphQLAuthorization,
  description: "Returns the current authorization.",
  args: {},
  async resolve(source, args, context): Promise<null | Authorization> {
    const { pool, authorization: a, realm } = context;
    const tx = await pool.connect();
    try {
      return a && (await a.isAccessibleBy(realm, a, tx)) ? a : null;
    } finally {
      tx.release();
    }
  }
};
