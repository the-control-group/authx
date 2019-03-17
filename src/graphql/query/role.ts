import { GraphQLFieldConfig, GraphQLID, GraphQLNonNull } from "graphql";
import { Context } from "../Context";
import { GraphQLRole } from "../GraphQLRole";
import { Role } from "../../models";

import { isSuperset, isStrictSuperset } from "scopeutils";

export const role: GraphQLFieldConfig<
  any,
  {
    id: string;
  },
  Context
> = {
  type: GraphQLRole,
  description: "Fetch a role by ID.",
  args: {
    id: {
      type: new GraphQLNonNull(GraphQLID)
    }
  },
  async resolve(source, args, context): Promise<null | Role> {
    const { tx, token: t, realm } = context;
    if (!t) return null;

    const role = await Role.read(tx, args.id);
    return (await role.isAccessibleBy(realm, t, tx)) ? role : null;
  }
};
