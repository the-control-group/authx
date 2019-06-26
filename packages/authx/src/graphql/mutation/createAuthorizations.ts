import v4 from "uuid/v4";
import { randomBytes } from "crypto";
import { isSuperset, isStrictSuperset } from "@authx/scopes";
import { GraphQLFieldConfig, GraphQLList, GraphQLNonNull } from "graphql";

import { Context } from "../../Context";
import { GraphQLAuthorization } from "../GraphQLAuthorization";
import { Authorization, User } from "../../model";
import { ForbiddenError } from "../../errors";
import { GraphQLCreateAuthorizationInput } from "./GraphQLCreateAuthorizationInput";

export const createAuthorizations: GraphQLFieldConfig<
  any,
  {
    authorizations: {
      enabled: boolean;
      userId: string;
      grantId: string;
      scopes: string[];
    }[];
  },
  Context
> = {
  type: new GraphQLList(GraphQLAuthorization),
  description: "Create a new authorization.",
  args: {
    authorizations: {
      type: new GraphQLNonNull(
        new GraphQLList(new GraphQLNonNull(GraphQLCreateAuthorizationInput))
      )
    }
  },
  async resolve(source, args, context): Promise<Promise<Authorization>[]> {
    const { pool, authorization: a, realm } = context;

    if (!a) {
      throw new ForbiddenError(
        "You must be authenticated to create an authorization."
      );
    }

    return args.authorizations.map(async input => {
      const tx = await pool.connect();
      try {
        if (
          // can create authorizations for all users
          !(await a.can(tx, `${realm}:authorization.*.*:write.*`)) &&
          // can create authorizations for users with equal access
          !(
            (await a.can(tx, `${realm}:authorization.equal.*:write.*`)) &&
            isSuperset(
              await (await a.user(tx)).access(tx),
              await (await User.read(tx, input.userId)).access(tx)
            )
          ) &&
          // can create authorizations for users with lesser access
          !(
            (await a.can(tx, `${realm}:authorization.equal.lesser:write.*`)) &&
            isStrictSuperset(
              await (await a.user(tx)).access(tx),
              await (await User.read(tx, input.userId)).access(tx)
            )
          ) &&
          // can create authorizations for self
          !(
            (await a.can(tx, `${realm}:authorization.equal.self:write.*`)) &&
            input.userId === a.userId
          )
        ) {
          throw new ForbiddenError(
            "You must be authenticated to create a authorization."
          );
        }

        try {
          await tx.query("BEGIN DEFERRABLE");
          const id = v4();
          const authorization = await Authorization.write(
            tx,
            {
              id,
              enabled: input.enabled,
              userId: input.userId,
              grantId: input.grantId,
              secret: randomBytes(16).toString("hex"),
              scopes: input.scopes
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
      } finally {
        tx.release();
      }
    });
  }
};
