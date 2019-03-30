import { GraphQLFieldConfig, GraphQLID, GraphQLNonNull } from "graphql";
import { Context } from "../../Context";
import { GraphQLGrant } from "../GraphQLGrant";
import { Grant } from "../../model";

export const grant: GraphQLFieldConfig<
  any,
  {
    id: string;
  },
  Context
> = {
  type: GraphQLGrant,
  description: "Fetch a grant by ID.",
  args: {
    id: {
      type: new GraphQLNonNull(GraphQLID)
    }
  },
  async resolve(source, args, context): Promise<null | Grant> {
    const { tx, token: t, realm } = context;
    if (!t) return null;

    const grant = await Grant.read(tx, args.id);
    return (await grant.isAccessibleBy(realm, t, tx)) ? grant : null;
  }
};
