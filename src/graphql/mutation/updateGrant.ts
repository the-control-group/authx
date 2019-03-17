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
import { ForbiddenError } from "../../errors";

export const updateGrant: GraphQLFieldConfig<
  any,
  {
    id: string;
    enabled: null | boolean;
    scopes: null | string[];
  },
  Context
> = {
  type: GraphQLGrant,
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
  async resolve(source, args, context): Promise<Grant> {
    const { tx, token: t, realm } = context;

    if (!t) {
      throw new ForbiddenError("You must be authenticated to update a grant.");
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
        throw new ForbiddenError(
          "You do not have permission to update this grant."
        );
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
        throw new ForbiddenError(
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
      return grant;
    } catch (error) {
      await tx.query("ROLLBACK");
      throw error;
    }
  }
};
