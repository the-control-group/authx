import {
  GraphQLFieldConfig,
  GraphQLID,
  GraphQLNonNull,
  GraphQLList
} from "graphql";
import { Context } from "../../Context";
import { GraphQLExplanation } from "../GraphQLExplanation";
import { getExplanations } from "../../util/explanations";

export const explanations: GraphQLFieldConfig<
  any,
  {
    scopes: string[];
  },
  Context
> = {
  type: GraphQLExplanation,
  description: "Fetch explanations of scopes.",
  args: {
    scopes: {
      type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(GraphQLID)))
    }
  },
  async resolve(
    source,
    args,
    context
  ): Promise<null | { scope: string; description: string }[]> {
    const { pool, authorization: a } = context;

    const tx = await pool.connect();
    try {
      const g = a && (await a.grant(tx));

      getExplanations(
        context.explanations,
        {
          currentAuthorizationId: (a && a.id) || null,
          currentGrantId: (a && a.grantId) || null,
          currentUserId: (a && a.userId) || null,
          currentClientId: g && g.id
        },
        args.scopes
      );

      return [];
    } finally {
      tx.release();
    }
  }
};
