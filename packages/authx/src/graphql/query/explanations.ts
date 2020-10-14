import { GraphQLFieldConfig, GraphQLList, GraphQLNonNull } from "graphql";
import { Context } from "../../Context";
import { GraphQLExplanation } from "../GraphQLExplanation";

export const explanations: GraphQLFieldConfig<
  any,
  Context,
  {
    scopes: string[];
  }
> = {
  type: new GraphQLList(new GraphQLNonNull(GraphQLExplanation)),
  description: "Fetch explanations of scopes.",
  resolve(
    source,
    args,
    { explanations }
  ): ReadonlyArray<{ scope: string; description: string }> {
    return explanations;
  },
};
