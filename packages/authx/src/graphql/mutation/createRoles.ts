import v4 from "uuid/v4";
import { isSuperset, isStrictSuperset } from "@authx/scopes";
import { GraphQLFieldConfig, GraphQLList, GraphQLNonNull } from "graphql";

import { Context } from "../../Context";
import { GraphQLRole } from "../GraphQLRole";
import { Role } from "../../model";
import { ForbiddenError } from "../../errors";
import { GraphQLCreateRoleInput } from "./GraphQLCreateRoleInput";

export const createRoles: GraphQLFieldConfig<
  any,
  {
    roles: {
      enabled: boolean;
      name: string;
      description: string;
      scopes: string[];
      userIds: string[];
    }[];
  },
  Context
> = {
  type: new GraphQLList(GraphQLRole),
  description: "Create a new role.",
  args: {
    roles: {
      type: new GraphQLNonNull(
        new GraphQLList(new GraphQLNonNull(GraphQLCreateRoleInput))
      )
    }
  },
  async resolve(source, args, context): Promise<Promise<Role>[]> {
    const { pool, authorization: a, realm } = context;

    if (!a) {
      throw new ForbiddenError("You must be authenticated to create a role.");
    }

    return args.roles.map(async input => {
      const tx = await pool.connect();
      try {
        if (
          // can create any roles
          !(await a.can(tx, `${realm}:role.*.*:write.*`)) &&
          // can create roles with equal access
          !(
            (await a.can(tx, `${realm}:role.equal.*:write.*`)) &&
            isSuperset(await (await a.user(tx)).access(tx), input.scopes)
          ) &&
          // can create roles with lesser access
          !(
            (await a.can(tx, `${realm}:role.equal.lesser:write.*`)) &&
            isStrictSuperset(await (await a.user(tx)).access(tx), input.scopes)
          )
        ) {
          throw new ForbiddenError(
            "You do not have permission to create a role."
          );
        }

        try {
          await tx.query("BEGIN DEFERRABLE");
          const id = v4();
          const role = await Role.write(
            tx,
            {
              id,
              enabled: input.enabled,
              name: input.name,
              description: input.description,
              scopes: input.scopes,
              userIds: input.userIds
            },
            {
              recordId: v4(),
              createdByAuthorizationId: a.id,
              createdAt: new Date()
            }
          );

          await tx.query("COMMIT");
          return role;
        } catch (error) {
          await tx.query("ROLLBACK");
          throw error;
        }
      } finally {
        tx.release();
      }
    });
  }
};
