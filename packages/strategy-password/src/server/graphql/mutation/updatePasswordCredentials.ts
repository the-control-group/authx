import { v4 } from "uuid";
import { hash } from "bcrypt";
import { GraphQLList, GraphQLFieldConfig, GraphQLNonNull } from "graphql";

import {
  Context,
  Credential,
  ForbiddenError,
  NotFoundError,
  ValidationError,
  validateIdFormat,
  DataLoaderExecutor
} from "@authx/authx";
import { PasswordCredential } from "../../model";
import { GraphQLPasswordCredential } from "../GraphQLPasswordCredential";
import { GraphQLUpdatePasswordCredentialInput } from "./GraphQLUpdatePasswordCredentialInput";

export const updatePasswordCredentials: GraphQLFieldConfig<
  any,
  Context,
  {
    credentials: {
      id: string;
      enabled: null | boolean;
      password: null | string;
    }[];
  }
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
        // Make sure this transaction is used for queries made by the executor.
        const executor = new DataLoaderExecutor(tx);

        await tx.query("BEGIN DEFERRABLE");

        const before = await Credential.read(
          executor,
          input.id,
          credentialMap,
          {
            forUpdate: true
          }
        );

        if (!(before instanceof PasswordCredential)) {
          throw new NotFoundError(
            "The authority uses a strategy other than password."
          );
        }

        if (
          !(await before.isAccessibleBy(realm, a, executor, {
            basic: "w",
            details: ""
          }))
        ) {
          throw new ForbiddenError(
            "You do not have permission to update this credential."
          );
        }

        if (
          typeof input.password === "string" &&
          !(await before.isAccessibleBy(realm, a, executor, {
            basic: "w",
            details: "w"
          }))
        ) {
          throw new ForbiddenError(
            "You do not have permission to update this credential's details."
          );
        }

        const credential = await PasswordCredential.write(
          executor,
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
                      (await before.authority(executor)).details.rounds
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

        // Update the context to use a new executor primed with the results of
        // this mutation, using the original connection pool.
        context.executor = new DataLoaderExecutor(pool, executor.key);

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
