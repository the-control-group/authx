import {
  GraphQLFieldConfig,
  GraphQLList,
  GraphQLNonNull,
  GraphQLString,
} from "graphql";
import { Context } from "../../Context";

export const keys: GraphQLFieldConfig<
  any,
  Context,
  { [key: string]: unknown }
> = {
  type: new GraphQLList(new GraphQLNonNull(GraphQLString)),
  description: "List all keys.",
  async resolve(source, args, context): Promise<ReadonlyArray<string>> {
    return context.publicKeys;
  },
};
