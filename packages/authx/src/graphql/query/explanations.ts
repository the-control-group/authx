import {
  GraphQLFieldConfig,
  GraphQLID,
  GraphQLNonNull,
  GraphQLList
} from "graphql";
import { Context } from "../../Context";
import { GraphQLExplanation } from "../GraphQLExplanation";

export const user: GraphQLFieldConfig<
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
    return [];
  }
};
