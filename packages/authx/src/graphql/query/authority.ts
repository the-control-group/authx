import { GraphQLFieldConfig, GraphQLID, GraphQLNonNull } from "graphql";
import { Context } from "../../Context.js";
import { GraphQLAuthority } from "../GraphQLAuthority.js";
import { Authority } from "../../model/index.js";

export const authority: GraphQLFieldConfig<
  any,
  Context,
  {
    id: string;
  }
> = {
  type: GraphQLAuthority,
  description: "Fetch an authority by ID.",
  args: {
    id: {
      type: new GraphQLNonNull(GraphQLID),
    },
  },
  async resolve(source, args, context): Promise<null | Authority<any>> {
    const { executor } = context;
    return await Authority.read(executor, args.id);
  },
};
