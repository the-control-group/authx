import v4 from "uuid/v4";
import { isSuperset, isStrictSuperset } from "scopeutils";
import {
  GraphQLBoolean,
  GraphQLFieldConfig,
  GraphQLList,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLString
} from "graphql";

import { Context } from "../Context";
import { GraphQLRole } from "../GraphQLRole";
import { Role } from "../../models";

export const GraphQLCreateRoleResult = new GraphQLObjectType({
  name: "CreateRoleResult",
  fields: () => ({
    success: { type: new GraphQLNonNull(GraphQLBoolean) },
    message: { type: GraphQLString },
    role: { type: GraphQLRole }
  })
});

export const createRole: GraphQLFieldConfig<
  any,
  {
    enabled: boolean;
    name: string;
    scopes: string[];
    userIds: string[];
  },
  Context
> = {
  type: GraphQLCreateRoleResult,
  description: "Create a new role.",
  args: {
    enabled: {
      type: GraphQLBoolean,
      defaultValue: true
    },
    name: {
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
      ),
      defaultValue: []
    }
  },
  async resolve(source, args, context) {
    const { tx, token: t, realm } = context;

    if (!t) {
      return {
        success: false,
        message: "You must be authenticated to create a role.",
        role: null
      };
    }

    if (
      // can create any roles
      !(await t.can(tx, `${realm}:role.*.*:write.*`)) &&
      // can create roles with equal access
      !(
        (await t.can(tx, `${realm}:role.equal.*:write.*`)) &&
        isSuperset(await (await t.user(tx)).access(tx), args.scopes)
      ) &&
      // can create roles with lesser access
      !(
        (await t.can(tx, `${realm}:role.equal.lesser:write.*`)) &&
        isStrictSuperset(await (await t.user(tx)).access(tx), args.scopes)
      )
    ) {
      return {
        success: false,
        message: "You do not have permission to create a role.",
        role: null
      };
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
          scopes: args.scopes,
          userIds: args.userIds
        },
        {
          recordId: v4(),
          createdByTokenId: t.id,
          createdAt: new Date()
        }
      );

      await tx.query("COMMIT");
      return {
        success: true,
        message: null,
        role
      };
    } catch (error) {
      console.error(error);
      await tx.query("ROLLBACK");
      return {
        success: false,
        message: error.message,
        token: null
      };
    }
  }
};
