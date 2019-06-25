import v4 from "uuid/v4";
import {
  GraphQLBoolean,
  GraphQLFieldConfig,
  GraphQLID,
  GraphQLNonNull
} from "graphql";

import {
  Context,
  Credential,
  ForbiddenError,
  NotFoundError
} from "@authx/authx";
import { OpenIdCredential } from "../../model";
import { GraphQLOpenIdCredential } from "../GraphQLOpenIdCredential";

export const updateOpenIdCredential: GraphQLFieldConfig<
  any,
  {
    id: string;
    enabled: null | boolean;
  },
  Context
> = {
  type: GraphQLOpenIdCredential,
  description: "Update a new credential.",
  args: {
    id: {
      type: new GraphQLNonNull(GraphQLID)
    },
    enabled: {
      type: GraphQLBoolean
    }
  },
  async resolve(source, args, context): Promise<OpenIdCredential> {
    const {
      pool,
      authorization: a,
      realm,
      strategies: { credentialMap }
    } = context;

    if (!a) {
      throw new ForbiddenError(
        "You must be authenticated to update a credential."
      );
    }

    const tx = await pool.connect();
    try {
      await tx.query("BEGIN DEFERRABLE");

      try {
        const before = await Credential.read(tx, args.id, credentialMap);

        if (!(before instanceof OpenIdCredential)) {
          throw new NotFoundError("No openid credential exists with this ID.");
        }

        if (!(await before.isAccessibleBy(realm, a, tx, "write.basic"))) {
          throw new ForbiddenError(
            "You do not have permission to update this credential."
          );
        }

        const credential = await OpenIdCredential.write(
          tx,
          {
            ...before,
            enabled:
              typeof args.enabled === "boolean" ? args.enabled : before.enabled
          },
          {
            recordId: v4(),
            createdByAuthorizationId: a.id,
            createdAt: new Date()
          }
        );

        await tx.query("COMMIT");
        return credential;
      } catch (error) {
        await tx.query("ROLLBACK");
        throw error;
      }
    } finally {
      tx.release();
    }
  }
};
