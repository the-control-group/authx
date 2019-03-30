import v4 from "uuid/v4";
import {
  GraphQLBoolean,
  GraphQLFieldConfig,
  GraphQLID,
  GraphQLNonNull,
} from "graphql";

import { Context } from "../../Context";
import { GraphQLToken } from "../GraphQLToken";
import { Token } from "../../model";
import { ForbiddenError } from "../../errors";

export const updateToken: GraphQLFieldConfig<
  any,
  {
    id: string;
    enabled: null | boolean;
  },
  Context
> = {
  type: GraphQLToken,
  description: "Update a new token.",
  args: {
    id: {
      type: new GraphQLNonNull(GraphQLID)
    },
    enabled: {
      type: GraphQLBoolean
    }
  },
  async resolve(source, args, context): Promise<Token> {
    const { tx, token: t, realm } = context;

    if (!t) {
      throw new ForbiddenError("You must be authenticated to update a token.");
    }

    await tx.query("BEGIN DEFERRABLE");

    try {
      const before = await Token.read(tx, args.id);

      if (!(await before.isAccessibleBy(realm, t, tx, "write.basic"))) {
        throw new ForbiddenError(
          "You do not have permission to update this token."
        );
      }

      const token = await Token.write(
        tx,
        {
          ...before,
          enabled:
            typeof args.enabled === "boolean" ? args.enabled : before.enabled
        },
        {
          recordId: v4(),
          createdByTokenId: t.id,
          createdByCredentialId: null,
          createdAt: new Date()
        }
      );

      await tx.query("COMMIT");
      return token;
    } catch (error) {
      await tx.query("ROLLBACK");
      throw error;
    }
  }
};
