import { GraphQLFieldConfig, GraphQLNonNull, GraphQLList } from "graphql";
import { Context } from "../../Context";
import { GraphQLExplanation } from "../GraphQLExplanation";
import { GraphQLScopeTemplate } from "../GraphQLScopeTemplate";
import { getExplanations } from "../../util/explanations";

export const explanations: GraphQLFieldConfig<
  any,
  {
    scopes: string[];
  },
  Context
> = {
  type: new GraphQLList(GraphQLExplanation),
  description: "Fetch explanations of scopes.",
  args: {
    scopes: {
      type: new GraphQLNonNull(
        new GraphQLList(new GraphQLNonNull(GraphQLScopeTemplate))
      )
    }
  },
  async resolve(
    source,
    args,
    { pool, authorization: a, explanations }
  ): Promise<null | ReadonlyArray<{ scope: string; description: string }>> {
    const tx = await pool.connect();
    try {
      const g = a && (await a.grant(tx));

      return getExplanations(
        explanations,
        {
          currentAuthorizationId: (a && a.id) || null,
          currentGrantId: (a && a.grantId) || null,
          currentUserId: (a && a.userId) || null,
          currentClientId: (g && g.id) || null
        },
        args.scopes
      );
    } finally {
      tx.release();
    }
  }
};
