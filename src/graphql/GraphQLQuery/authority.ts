import { GraphQLFieldConfig, GraphQLID, GraphQLNonNull } from "graphql";
import { Context } from "../Context";
import { GraphQLAuthority } from "../GraphQLAuthority";
import { Authority } from "../../models";

export const authority: GraphQLFieldConfig<
  any,
  {
    id: string;
  },
  Context
> = {
  type: GraphQLAuthority,
  description: "Fetch a authority by ID.",
  args: {
    id: {
      type: new GraphQLNonNull(GraphQLID)
    }
  },
  async resolve(source, args, context) {
    const { tx, token, realm, authorityMap } = context;

    // can view all authoritys
    if (token && (await token.can(tx, `${realm}:authority.*:read`))) {
      return Authority.read(tx, args.id, authorityMap);
    }

    return null;
  }
};
