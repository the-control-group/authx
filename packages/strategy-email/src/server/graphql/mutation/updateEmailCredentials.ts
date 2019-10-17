import v4 from "uuid/v4";
import { GraphQLFieldConfig, GraphQLNonNull, GraphQLList } from "graphql";

import {
  Context,
  Credential,
  ForbiddenError,
  NotFoundError,
  ValidationError,
  validateIdFormat
} from "@authx/authx";
import { EmailCredential } from "../../model";
import { GraphQLEmailCredential } from "../GraphQLEmailCredential";
import { GraphQLUpdateEmailCredentialInput } from "./GraphQLUpdateEmailCredentialInput";

export const updateEmailCredentials: GraphQLFieldConfig<
  any,
  {
    credentials: {
      id: string;
      enabled: null | boolean;
    }[];
  },
  Context
> = {
  type: new GraphQLList(GraphQLEmailCredential),
  description: "Update a new credential.",
  args: {
    credentials: {
      type: new GraphQLNonNull(
        new GraphQLList(new GraphQLNonNull(GraphQLUpdateEmailCredentialInput))
      )
    }
  },
  async resolve(source, args, context): Promise<Promise<EmailCredential>[]> {
    const {
      pool,
      authorization: a,
      realm,
      strategies: { credentialMap }
    } = context;

    if (!a) {
      throw new ForbiddenError(
        "You must be authenticated to update an credential."
      );
    }

    return args.credentials.map(async input => {
      // Validate `id`.
      if (!validateIdFormat(input.id)) {
        throw new ValidationError("The provided `id` is an invalid ID.");
      }

      const tx = await pool.connect();
      try {
        await tx.query("BEGIN DEFERRABLE");

        const before = await Credential.read(tx, input.id, credentialMap, {
          forUpdate: true
        });

        if (!(before instanceof EmailCredential)) {
          throw new NotFoundError("No email credential exists with this ID.");
        }

        if (!(await before.isAccessibleBy(realm, a, tx, "write.basic"))) {
          throw new ForbiddenError(
            "You do not have permission to update this credential."
          );
        }

        const credential = await EmailCredential.write(
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
