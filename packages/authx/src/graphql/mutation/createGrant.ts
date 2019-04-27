import v4 from "uuid/v4";
import { randomBytes } from "crypto";

import { isSuperset, isStrictSuperset } from "scopeutils";
import {
  GraphQLBoolean,
  GraphQLFieldConfig,
  GraphQLID,
  GraphQLList,
  GraphQLNonNull,
  GraphQLString
} from "graphql";

import { Context } from "../../Context";
import { GraphQLGrant } from "../GraphQLGrant";
import { Grant, User } from "../../model";
import { ForbiddenError } from "../../errors";

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
  type: GraphQLGrant,
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
  async resolve(source, args, context): Promise<Grant> {
    const { tx, authorization: a, realm } = context;

    if (!a) {
      throw new ForbiddenError("You must be authenticated to create a grant.");
    }

    if (
      // can create grants for all users
      !(await a.can(tx, `${realm}:grant.*.*.*:write.*`)) &&
      // can create grants for users with equal access
      !(
        (await a.can(tx, `${realm}:grant.equal.*.*:write.*`)) &&
        isSuperset(
          await (await a.user(tx)).access(tx),
          await (await User.read(tx, args.userId)).access(tx)
        )
      ) &&
      // can create grants for users with lesser access
      !(
        (await a.can(tx, `${realm}:grant.equal.lesser.*:write.*`)) &&
        isStrictSuperset(
          await (await a.user(tx)).access(tx),
          await (await User.read(tx, args.userId)).access(tx)
        )
      ) &&
      // can create grants for self
      !(
        (await a.can(tx, `${realm}:grant.equal.self.*:write.*`)) &&
        args.userId === a.userId
      )
    ) {
      throw new ForbiddenError("You do not have permission to create a grant.");
    }

    await tx.query("BEGIN DEFERRABLE");

    try {
      const id = v4();
      const now = Math.floor(Date.now() / 1000);
      const grant = await Grant.write(
        tx,
        {
          id,
          enabled: args.enabled,
          userId: args.userId,
          clientId: args.clientId,
          secrets: [
            Buffer.from(
              [id, now, randomBytes(16).toString("hex")].join(":")
            ).toString("base64")
          ],
          codes: [
            Buffer.from(
              [id, now, randomBytes(16).toString("hex")].join(":")
            ).toString("base64")
          ],
          scopes: args.scopes
        },
        {
          recordId: v4(),
          createdByAuthorizationId: a.id,
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
