import v4 from "uuid/v4";
import { isSuperset, isStrictSuperset } from "scopeutils";
import {
  GraphQLBoolean,
  GraphQLFieldConfig,
  GraphQLID,
  GraphQLList,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLString
} from "graphql";

import { Context } from "../Context";
import { GraphQLGrant } from "../GraphQLGrant";
import { Grant, User } from "../../models";

export const GraphQLUpdateGrantResult = new GraphQLObjectType({
  name: "UpdateGrantResult",
  fields: () => ({
    success: { type: new GraphQLNonNull(GraphQLBoolean) },
    message: { type: GraphQLString },
    grant: { type: GraphQLGrant }
  })
});

export const updateGrant: GraphQLFieldConfig<
  any,
  {
    id: string;
    enabled: null | boolean;
    scopes: null | string[];
  },
  Context
> = {
  type: GraphQLUpdateGrantResult,
  description: "Update a new grant.",
  args: {
    id: {
      type: new GraphQLNonNull(GraphQLID)
    },
    enabled: {
      type: GraphQLBoolean
    },
    scopes: {
      type: new GraphQLList(new GraphQLNonNull(GraphQLString))
    }
  },
  async resolve(source, args, context) {
    const { tx, token: t, realm } = context;

    if (!t) {
      return {
        success: false,
        message: "You must be authenticated to update a grant.",
        grant: null
      };
    }

    await tx.query("BEGIN DEFERRABLE");

    try {
      const before = await Grant.read(tx, args.id);

      if (
        // can update grants for all users
        !(await t.can(tx, `${realm}:grant.*.*:write.basic`)) &&
        // can update grants for users with equal access
        !(
          (await t.can(tx, `${realm}:grant.equal.*:write.basic`)) &&
          isSuperset(
            await (await t.user(tx)).access(tx),
            await (await User.read(tx, before.userId)).access(tx)
          )
        ) &&
        // can update grants for users with lesser access
        !(
          (await t.can(tx, `${realm}:grant.equal.lesser:write.basic`)) &&
          isStrictSuperset(
            await (await t.user(tx)).access(tx),
            await (await before.user(tx)).access(tx)
          )
        ) &&
        // can update grants for self
        !(
          (await t.can(tx, `${realm}:grant.equal.self:write.basic`)) &&
          before.userId === t.userId
        )
      ) {
        throw new Error("You do not have permission to update this grant.");
      }

      if (
        args.scopes &&
        // can update grants for all users
        !(await t.can(tx, `${realm}:grant.*.*:write.scopes`)) &&
        // can update grants for users with equal access
        !(
          (await t.can(tx, `${realm}:grant.equal.*:write.scopes`)) &&
          isSuperset(
            await (await t.user(tx)).access(tx),
            await (await User.read(tx, before.id)).access(tx)
          )
        ) &&
        // can update grants for users with lesser access
        !(
          (await t.can(tx, `${realm}:grant.equal.lesser:write.scopes`)) &&
          isStrictSuperset(
            await (await t.user(tx)).access(tx),
            await (await before.user(tx)).access(tx)
          )
        ) &&
        // can update grants for self
        !(
          (await t.can(tx, `${realm}:grant.equal.self:write.scopes`)) &&
          before.userId === t.userId
        )
      ) {
        throw new Error(
          "You do not have permission to update this grant's scopes."
        );
      }

      const grant = await Grant.write(
        tx,
        {
          ...before,
          enabled:
            typeof args.enabled === "boolean" ? args.enabled : before.enabled,
          scopes: args.scopes || before.scopes
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
        grant
      };
    } catch (error) {
      console.error(error);
      await tx.query("ROLLBACK");
      return {
        success: false,
        message: error.message,
        grant: null
      };
    }
  }
};
