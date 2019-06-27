import v4 from "uuid/v4";
import { GraphQLFieldConfig, GraphQLNonNull, GraphQLList } from "graphql";

import {
  Context,
  Credential,
  ForbiddenError,
  NotFoundError
} from "@authx/authx";
import { OpenIdCredential } from "../../model";
import { GraphQLOpenIdCredential } from "../GraphQLOpenIdCredential";
import { GraphQLUpdateOpenIdCredentialInput } from "./GraphQLUpdateOpenIdCredentialInput";

export const updateOpenIdCredentials: GraphQLFieldConfig<
  any,
  {
    credentials: {
      id: string;
      enabled: null | boolean;
    }[];
  },
  Context
> = {
  type: new GraphQLList(GraphQLOpenIdCredential),
  description: "Update a new credential.",
  args: {
    credentials: {
      type: new GraphQLNonNull(
        new GraphQLList(new GraphQLNonNull(GraphQLUpdateOpenIdCredentialInput))
      )
    }
  },
  async resolve(source, args, context): Promise<Promise<OpenIdCredential>[]> {
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

    return args.credentials.map(async input => {
      const tx = await pool.connect();
      try {
        await tx.query("BEGIN DEFERRABLE");

        const before = await Credential.read(tx, input.id, credentialMap, {
          forUpdate: true
        });

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
              typeof input.enabled === "boolean"
                ? input.enabled
                : before.enabled
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
      } finally {
        tx.release();
      }
    });
  }
};
