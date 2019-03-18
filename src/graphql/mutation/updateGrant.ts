import v4 from "uuid/v4";
import {
  GraphQLBoolean,
  GraphQLFieldConfig,
  GraphQLID,
  GraphQLList,
  GraphQLNonNull,
  GraphQLString
} from "graphql";

import { Context } from "../Context";
import { GraphQLGrant } from "../GraphQLGrant";
import { Grant } from "../../model";
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

      if (!(await before.isAccessibleBy(realm, t, tx, "write.basic"))) {
        throw new ForbiddenError(
          "You do not have permission to update this grant."
        );
      }

      if (
        args.scopes &&
        !(await before.isAccessibleBy(realm, t, tx, "write.scopes"))
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
