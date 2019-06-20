import v4 from "uuid/v4";
import { randomBytes } from "crypto";
import { isSuperset, isStrictSuperset } from "@authx/scopes";
import {
  GraphQLBoolean,
  GraphQLFieldConfig,
  GraphQLID,
  GraphQLList,
  GraphQLNonNull,
  GraphQLString
} from "graphql";

import { Context } from "../../Context";
import { GraphQLAuthorization } from "../GraphQLAuthorization";
import { Authorization, User } from "../../model";
import { ForbiddenError } from "../../errors";

export const createAuthorization: GraphQLFieldConfig<
  any,
  {
    enabled: boolean;
    userId: string;
    grantId: string;
    scopes: string[];
  },
  Context
> = {
  type: GraphQLAuthorization,
  description: "Create a new authorization.",
  args: {
    enabled: {
      type: GraphQLBoolean,
      defaultValue: true
    },
    userId: {
      type: new GraphQLNonNull(GraphQLID)
    },
    grantId: {
      type: new GraphQLNonNull(GraphQLID)
    },
    scopes: {
      type: new GraphQLNonNull(
        new GraphQLList(new GraphQLNonNull(GraphQLString))
      )
    }
  },
  async resolve(source, args, context): Promise<Authorization> {
    const { tx, authorization: a, realm } = context;

    if (!a) {
      throw new ForbiddenError(
        "You must be authenticated to create an authorization."
      );
    }

    if (
      // can create authorizations for all users
      !(await a.can(tx, `${realm}:authorization.*.*:write.*`)) &&
      // can create authorizations for users with equal access
      !(
        (await a.can(tx, `${realm}:authorization.equal.*:write.*`)) &&
        isSuperset(
          await (await a.user(tx)).access(tx),
          await (await User.read(tx, args.userId)).access(tx)
        )
      ) &&
      // can create authorizations for users with lesser access
      !(
        (await a.can(tx, `${realm}:authorization.equal.lesser:write.*`)) &&
        isStrictSuperset(
          await (await a.user(tx)).access(tx),
          await (await User.read(tx, args.userId)).access(tx)
        )
      ) &&
      // can create authorizations for self
      !(
        (await a.can(tx, `${realm}:authorization.equal.self:write.*`)) &&
        args.userId === a.userId
      )
    ) {
      throw new ForbiddenError(
        "You must be authenticated to create a authorization."
      );
    }

    await tx.query("BEGIN DEFERRABLE");

    try {
      const id = v4();
      const authorization = await Authorization.write(
        tx,
        {
          id,
          enabled: args.enabled,
          userId: args.userId,
          grantId: args.grantId,
          secret: randomBytes(16).toString("hex"),
          scopes: args.scopes
        },
        {
          recordId: v4(),
          createdByAuthorizationId: a.id,
          createdByCredentialId: null,
          createdAt: new Date()
        }
      );

      await tx.query("COMMIT");
      return authorization;
    } catch (error) {
      await tx.query("ROLLBACK");
      throw error;
    }
  }
};
