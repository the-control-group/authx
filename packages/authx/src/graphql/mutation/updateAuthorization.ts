import v4 from "uuid/v4";
import {
  GraphQLBoolean,
  GraphQLFieldConfig,
  GraphQLID,
  GraphQLNonNull
} from "graphql";

import { Context } from "../../Context";
import { GraphQLAuthorization } from "../GraphQLAuthorization";
import { Authorization } from "../../model";
import { ForbiddenError } from "../../errors";

export const updateAuthorization: GraphQLFieldConfig<
  any,
  {
    id: string;
    enabled: null | boolean;
  },
  Context
> = {
  type: GraphQLAuthorization,
  description: "Update a new authorization.",
  args: {
    id: {
      type: new GraphQLNonNull(GraphQLID)
    },
    enabled: {
      type: GraphQLBoolean
    }
  },
  async resolve(source, args, context): Promise<Authorization> {
    const { tx, authorization: a, realm } = context;

    if (!a) {
      throw new ForbiddenError(
        "You must be authenticated to update a authorization."
      );
    }

    await tx.query("BEGIN DEFERRABLE");

    try {
      const before = await Authorization.read(tx, args.id);

      if (!(await before.isAccessibleBy(realm, a, tx, "write.basic"))) {
        throw new ForbiddenError(
          "You do not have permission to update this authorization."
        );
      }

      const authorization = await Authorization.write(
        tx,
        {
          ...before,
          enabled:
            typeof args.enabled === "boolean" ? args.enabled : before.enabled
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
