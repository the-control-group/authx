import v4 from "uuid/v4";
import { hash } from "bcrypt";
import {
  GraphQLBoolean,
  GraphQLFieldConfig,
  GraphQLID,
  GraphQLNonNull,
  GraphQLString,
  GraphQLInputObjectType
} from "graphql";

import { Context } from "../../../../graphql/Context";
import { Credential } from "../../../../model";
import { EmailCredential } from "../../model";
import { ForbiddenError, NotFoundError } from "../../../../errors";
import { GraphQLEmailCredential } from "../GraphQLEmailCredential";

export const GraphQLUpdateEmailCredentialDetailsInput = new GraphQLInputObjectType(
  {
    name: "UpdateEmailCredentialDetailsInput",
    fields: () => ({
      email: {
        type: GraphQLString,
        description: "The plaintext email to use for this credential."
      }
    })
  }
);

export const updateEmailCredential: GraphQLFieldConfig<
  any,
  {
    id: string;
    enabled: null | boolean;
    details: null | {
      email: null | string;
    };
  },
  Context
> = {
  type: GraphQLEmailCredential,
  description: "Update a new credential.",
  args: {
    id: {
      type: new GraphQLNonNull(GraphQLID)
    },
    enabled: {
      type: GraphQLBoolean
    },
    details: {
      type: GraphQLUpdateEmailCredentialDetailsInput,
      description: "Credential details, specific to the email strategy."
    }
  },
  async resolve(source, args, context): Promise<EmailCredential> {
    const { tx, token: t, realm, credentialMap } = context;

    if (!t) {
      throw new ForbiddenError(
        "You must be authenticated to update an credential."
      );
    }

    await tx.query("BEGIN DEFERRABLE");

    try {
      const before = await Credential.read(tx, args.id, credentialMap);

      if (!(before instanceof EmailCredential)) {
        throw new NotFoundError("No email credential exists with this ID.");
      }

      if (!(await before.isAccessibleBy(realm, t, tx, "write.basic"))) {
        throw new ForbiddenError(
          "You do not have permission to update this credential."
        );
      }

      if (
        args.details &&
        !(await before.isAccessibleBy(realm, t, tx, "write.details"))
      ) {
        throw new ForbiddenError(
          "You do not have permission to update this credential's details."
        );
      }

      const credential = await EmailCredential.write(
        tx,
        {
          ...before,
          enabled:
            typeof args.enabled === "boolean" ? args.enabled : before.enabled,
          details: args.details
            ? {
                hash:
                  typeof args.details.email === "string"
                    ? await hash(
                        args.details.email,
                        (await before.authority(tx)).details.rounds
                      )
                    : before.details.hash
              }
            : before.details
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
