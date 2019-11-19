import v4 from "uuid/v4";
import { hash } from "bcrypt";
import { GraphQLList, GraphQLFieldConfig, GraphQLNonNull } from "graphql";

import {
  Context,
  Credential,
  ForbiddenError,
  NotFoundError,
  ValidationError,
  validateIdFormat
} from "@authx/authx";
import { PasswordCredential } from "../../model";
import { GraphQLPasswordCredential } from "../GraphQLPasswordCredential";
import { GraphQLUpdatePasswordCredentialInput } from "./GraphQLUpdatePasswordCredentialInput";

export const updatePasswordCredentials: GraphQLFieldConfig<
  any,
  {
    credentials: {
      id: string;
      enabled: null | boolean;
      password: null | string;
    }[];
  },
  Context
> = {
  type: new GraphQLList(GraphQLPasswordCredential),
  description: "Update a new credential.",
  args: {
    credentials: {
      type: new GraphQLNonNull(
        new GraphQLList(
          new GraphQLNonNull(GraphQLUpdatePasswordCredentialInput)
        )
      )
    }
  },
  async resolve(source, args, context): Promise<Promise<PasswordCredential>[]> {
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

        if (!(before instanceof PasswordCredential)) {
          throw new NotFoundError(
            "The authority uses a strategy other than password."
          );
        }

        if (!(await before.isAccessibleBy(realm, a, tx, "write.basic"))) {
          throw new ForbiddenError(
            "You do not have permission to update this credential."
          );
        }

        if (
          typeof input.password === "string" &&
          !(await before.isAccessibleBy(realm, a, tx, "write.*"))
        ) {
          throw new ForbiddenError(
            "You do not have permission to update this credential's details."
          );
        }

        const credential = await PasswordCredential.write(
          tx,
          {
            ...before,
            enabled:
              typeof input.enabled === "boolean"
                ? input.enabled
                : before.enabled,
            details: {
              ...before.details,
              hash:
                typeof input.password === "string"
                  ? await hash(
                      input.password,
                      (await before.authority(tx)).details.rounds
                    )
                  : before.details.hash
            }
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
