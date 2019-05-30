import v4 from "uuid/v4";
import { isSuperset, isStrictSuperset } from "@authx/scopes";
import {
  GraphQLBoolean,
  GraphQLFieldConfig,
  GraphQLList,
  GraphQLNonNull,
  GraphQLString
} from "graphql";

import { Context } from "../../Context";
import { GraphQLRole } from "../GraphQLRole";
import { Role } from "../../model";
import { ForbiddenError } from "../../errors";

export const createRole: GraphQLFieldConfig<
  any,
  {
    enabled: boolean;
    name: string;
    description: string;
    scopes: string[];
    userIds: string[];
  },
  Context
> = {
  type: GraphQLRole,
  description: "Create a new role.",
  args: {
    enabled: {
      type: GraphQLBoolean,
      defaultValue: true
    },
    name: {
      type: new GraphQLNonNull(GraphQLString)
    },
    description: {
      type: new GraphQLNonNull(GraphQLString)
    },
    scopes: {
      type: new GraphQLNonNull(
        new GraphQLList(new GraphQLNonNull(GraphQLString))
      )
    },
    userIds: {
      type: new GraphQLNonNull(
        new GraphQLList(new GraphQLNonNull(GraphQLString))
      )
    }
  },
  async resolve(source, args, context): Promise<Role> {
    const { tx, authorization: a, realm } = context;

    if (!a) {
      throw new ForbiddenError("You must be authenticated to create a role.");
    }

    if (
      // can create any roles
      !(await a.can(tx, `${realm}:role.*.*:write.*`)) &&
      // can create roles with equal access
      !(
        (await a.can(tx, `${realm}:role.equal.*:write.*`)) &&
        isSuperset(await (await a.user(tx)).access(tx), args.scopes)
      ) &&
      // can create roles with lesser access
      !(
        (await a.can(tx, `${realm}:role.equal.lesser:write.*`)) &&
        isStrictSuperset(await (await a.user(tx)).access(tx), args.scopes)
      )
    ) {
      throw new ForbiddenError("You do not have permission to create a role.");
    }

    await tx.query("BEGIN DEFERRABLE");

    try {
      const id = v4();
      const role = await Role.write(
        tx,
        {
          id,
          enabled: args.enabled,
          name: args.name,
          description: args.description,
          scopes: args.scopes,
          userIds: args.userIds
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
  }
};
