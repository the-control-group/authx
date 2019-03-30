import v4 from "uuid/v4";
import { hash } from "bcrypt";
import {
  GraphQLBoolean,
  GraphQLFieldConfig,
  GraphQLID,
  GraphQLNonNull,
  GraphQLString
} from "graphql";

import { Context } from "../../../../Context";
import { Credential } from "../../../../model";
import { PasswordCredential } from "../../model";
import { ForbiddenError, NotFoundError } from "../../../../errors";
import { GraphQLPasswordCredential } from "../GraphQLPasswordCredential";

export const updatePasswordCredential: GraphQLFieldConfig<
  any,
  {
    id: string;
    enabled: null | boolean;
    password: null | string;
  },
  Context
> = {
  type: GraphQLPasswordCredential,
  description: "Update a new credential.",
  args: {
    id: {
      type: new GraphQLNonNull(GraphQLID)
    },
    enabled: {
      type: GraphQLBoolean
    },
    password: {
      type: GraphQLString,
      description: "The plaintext password to use for this credential."
    }
  },
  async resolve(source, args, context): Promise<PasswordCredential> {
    const {
      tx,
      token: t,
      realm,
      strategies: { credentialMap }
    } = context;

    if (!t) {
      throw new ForbiddenError(
        "You must be authenticated to update an credential."
      );
    }

    await tx.query("BEGIN DEFERRABLE");

    try {
      const before = await Credential.read(tx, args.id, credentialMap);

      if (!(before instanceof PasswordCredential)) {
        throw new NotFoundError("No password credential exists with this ID.");
      }

      if (!(await before.isAccessibleBy(realm, t, tx, "write.basic"))) {
        throw new ForbiddenError(
          "You do not have permission to update this credential."
        );
      }

      if (
        args.password &&
        !(await before.isAccessibleBy(realm, t, tx, "write.details"))
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
            typeof args.enabled === "boolean" ? args.enabled : before.enabled,
          details: {
            ...before.details,
            hash:
              typeof args.password === "string"
                ? await hash(
                    args.password,
                    (await before.authority(tx)).details.rounds
                  )
                : before.details.hash
          }
        },
        {
          recordId: v4(),
          createdByTokenId: t.id,
          createdAt: new Date()
        }
      );

      await tx.query("COMMIT");
      return credential;
    } catch (error) {
      await tx.query("ROLLBACK");
      throw error;
    }
  }
};
