import { GraphQLFieldConfig, GraphQLID, GraphQLNonNull } from "graphql";
import { Context } from "../../Context";
import { GraphQLRole } from "../GraphQLRole";
import { Role } from "../../model";

export const role: GraphQLFieldConfig<
  any,
  Context,
  {
    id: string;
  }
> = {
  type: GraphQLRole,
  description: "Fetch a role by ID.",
  args: {
    id: {
      type: new GraphQLNonNull(GraphQLID),
    },
  },
  async resolve(source, args, context): Promise<null | Role> {
    const { executor, authorization: a, realm } = context;
    if (!a) return null;

    const role = await Role.read(executor, args.id);
    return (await role.isAccessibleBy(realm, a, executor)) ? role : null;
  },
};
