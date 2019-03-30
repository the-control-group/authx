import { GraphQLFieldConfig, GraphQLID, GraphQLNonNull } from "graphql";
import { Context } from "../../Context";
import { GraphQLAuthority } from "../GraphQLAuthority";
import { Authority } from "../../model";

export const authority: GraphQLFieldConfig<
  any,
  {
    id: string;
  },
  Context
> = {
  type: GraphQLAuthority,
  description: "Fetch an authority by ID.",
  args: {
    id: {
      type: new GraphQLNonNull(GraphQLID)
    }
  },
  async resolve(source, args, context): Promise<null | Authority<any>> {
    const {
      tx,
      token: t,
      realm,
      strategies: { authorityMap }
    } = context;
    if (!t) return null;

    const authority = await Authority.read(tx, args.id, authorityMap);
    return (await authority.isAccessibleBy(realm, t, tx)) ? authority : null;
  }
};
