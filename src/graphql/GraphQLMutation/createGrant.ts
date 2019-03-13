import v4 from "uuid/v4";
import { randomBytes } from "crypto";

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

export const GraphQLCreateGrantResult = new GraphQLObjectType({
  name: "CreateGrantResult",
  fields: () => ({
    success: { type: new GraphQLNonNull(GraphQLBoolean) },
    message: { type: GraphQLString },
    grant: { type: GraphQLGrant }
  })
});

export const createGrant: GraphQLFieldConfig<
  any,
  {
    enabled: boolean;
    userId: string;
    clientId: string;
    scopes: string[];
  },
  Context
> = {
  type: GraphQLCreateGrantResult,
  description: "Create a new grant.",
  args: {
    enabled: {
      type: GraphQLBoolean,
      defaultValue: true
    },
    userId: {
      type: new GraphQLNonNull(GraphQLID)
    },
    clientId: {
      type: new GraphQLNonNull(GraphQLID)
    },
    scopes: {
      type: new GraphQLNonNull(
        new GraphQLList(new GraphQLNonNull(GraphQLString))
      )
    }
  },
  async resolve(source, args, context) {
    const { tx, token: t, realm } = context;

    if (!t) {
      return {
        success: false,
        message: "You must be authenticated to create a grant.",
        grant: null
      };
    }

    if (
      // can create grants for all users
      !(await t.can(tx, `${realm}:grant.*.*:write.*`)) &&
      // can create grants for users with equal access
      !(
        (await t.can(tx, `${realm}:grant.equal.*:write.*`)) &&
        isSuperset(
          await (await t.user(tx)).access(tx),
          await (await User.read(tx, args.userId)).access(tx)
        )
      ) &&
      // can create grants for users with lesser access
      !(
        (await t.can(tx, `${realm}:grant.equal.lesser:write.*`)) &&
        isStrictSuperset(
          await (await t.user(tx)).access(tx),
          await (await User.read(tx, args.userId)).access(tx)
        )
      ) &&
      // can create grants for self
      !(
        (await t.can(tx, `${realm}:grant.equal.self:write.*`)) &&
        args.userId === t.userId
      )
    ) {
      return {
        success: false,
        message: "You do not have permission to create a grant.",
        grant: null
      };
    }

    await tx.query("BEGIN DEFERRABLE");

    try {
      const id = v4();
      const grant = await Grant.write(
        tx,
        {
          id,
          enabled: args.enabled,
          userId: args.userId,
          clientId: args.clientId,
          oauthNonce: null,
          oauthRefreshToken: randomBytes(32).toString("hex"),
          scopes: args.scopes
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
