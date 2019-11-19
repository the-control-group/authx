import { GraphQLFieldConfig, GraphQLNonNull, GraphQLList } from "graphql";
import { Context } from "../../Context";
import { GraphQLExplanation } from "../GraphQLExplanation";

export const explanations: GraphQLFieldConfig<
  any,
  {
    scopes: string[];
  },
  Context
> = {
  type: new GraphQLList(new GraphQLNonNull(GraphQLExplanation)),
  description: "Fetch explanations of scopes.",
  resolve(
    source,
    args,
    { explanations }
  ): ReadonlyArray<{ scope: string; description: string }> {
    return explanations;
  }
};
