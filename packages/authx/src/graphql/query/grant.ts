import { GraphQLFieldConfig, GraphQLID, GraphQLNonNull } from "graphql";
import { Context } from "../../Context.js";
import { GraphQLGrant } from "../GraphQLGrant.js";
import { Grant } from "../../model/index.js";

export const grant: GraphQLFieldConfig<
  any,
  Context,
  {
    id: string;
  }
> = {
  type: GraphQLGrant,
  description: "Fetch a grant by ID.",
  args: {
    id: {
      type: new GraphQLNonNull(GraphQLID),
    },
  },
  async resolve(source, args, context): Promise<null | Grant> {
    const { executor, authorization: a, realm } = context;
    if (!a) return null;

    const grant = await Grant.read(executor, args.id);
    return (await grant.isAccessibleBy(realm, a, executor)) ? grant : null;
  },
};
