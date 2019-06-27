import v4 from "uuid/v4";
import { randomBytes } from "crypto";

import { isSuperset, isStrictSuperset } from "@authx/scopes";
import { GraphQLFieldConfig, GraphQLList, GraphQLNonNull } from "graphql";

import { Context } from "../../Context";
import { GraphQLGrant } from "../GraphQLGrant";
import { Grant, User } from "../../model";
import { ForbiddenError, ConflictError, NotFoundError } from "../../errors";
import { GraphQLCreateGrantInput } from "./GraphQLCreateGrantInput";

export const createGrants: GraphQLFieldConfig<
  any,
  {
    grants: {
      id: null | string;
      enabled: boolean;
      userId: string;
      clientId: string;
      scopes: string[];
    }[];
  },
  Context
> = {
  type: new GraphQLList(GraphQLGrant),
  description: "Create a new grant.",
  args: {
    grants: {
      type: new GraphQLNonNull(
        new GraphQLList(new GraphQLNonNull(GraphQLCreateGrantInput))
      )
    }
  },
  async resolve(source, args, context): Promise<Promise<Grant>[]> {
    const { pool, authorization: a, realm } = context;

    if (!a) {
      throw new ForbiddenError("You must be authenticated to create a grant.");
    }

    return args.grants.map(async input => {
      const tx = await pool.connect();
      try {
        if (
          // can create grants for all users
          !(await a.can(tx, `${realm}:grant.*.*.*:write.*`)) &&
          // can create grants for users with equal access
          !(
            (await a.can(tx, `${realm}:grant.equal.*.*:write.*`)) &&
            isSuperset(
              await (await a.user(tx)).access(tx),
              await (await User.read(tx, input.userId)).access(tx)
            )
          ) &&
          // can create grants for users with lesser access
          !(
            (await a.can(tx, `${realm}:grant.equal.lesser.*:write.*`)) &&
            isStrictSuperset(
              await (await a.user(tx)).access(tx),
              await (await User.read(tx, input.userId)).access(tx)
            )
          ) &&
          // can create grants for self
          !(
            (await a.can(tx, `${realm}:grant.equal.self.*:write.*`)) &&
            input.userId === a.userId
          )
        ) {
          throw new ForbiddenError(
            "You do not have permission to create a grant."
          );
        }

        try {
          await tx.query("BEGIN DEFERRABLE");

          // Make sure the ID isn't already in use.
          if (input.id) {
            try {
              await Grant.read(tx, input.id, { forUpdate: true });
              throw new ConflictError();
            } catch (error) {
              if (!(error instanceof NotFoundError)) {
                throw error;
              }
            }
          }

          const id = v4();
          const now = Math.floor(Date.now() / 1000);
          const grant = await Grant.write(
            tx,
            {
              id,
              enabled: input.enabled,
              userId: input.userId,
              clientId: input.clientId,
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
              scopes: input.scopes
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
      } finally {
        tx.release();
      }
    });
  }
};
