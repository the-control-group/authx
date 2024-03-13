import { GraphQLFieldConfig, GraphQLList, GraphQLNonNull } from "graphql";
import { Context } from "../../Context.js";
import { GraphQLExplanation } from "../GraphQLExplanation.js";

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
    { explanations },
  ): ReadonlyArray<{ scope: string; description: string }> {
    return explanations;
  },
};
