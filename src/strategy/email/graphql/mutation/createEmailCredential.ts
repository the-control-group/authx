import v4 from "uuid/v4";
import {
  GraphQLBoolean,
  GraphQLFieldConfig,
  GraphQLID,
  GraphQLNonNull,
  GraphQLString,
  GraphQLInputObjectType
} from "graphql";

import { Context } from "../../../../graphql/Context";
import { Authority } from "../../../../model";
import { EmailCredential, EmailAuthority } from "../../model";
import { ForbiddenError, NotFoundError } from "../../../../errors";
import { GraphQLEmailCredential } from "../GraphQLEmailCredential";

// TODO: VERIFY
function verify(proof: string): boolean {
  return true;
}

export const GraphQLCreateEmailCredentialDetailsInput = new GraphQLInputObjectType(
  {
    name: "CreateEmailCredentialDetailsInput",
    fields: () => ({
      email: {
        type: new GraphQLNonNull(GraphQLString),
        description: "The plaintext email to use for this credential."
      }
    })
  }
);

export const createEmailCredential: GraphQLFieldConfig<
  any,
  {
    enabled: boolean;
    userId: string;
    authorityId: string;
    authorityUserId: string;
    proof: null | string;
  },
  Context
> = {
  type: GraphQLEmailCredential,
  description: "Create a new credential.",
  args: {
    enabled: {
      type: new GraphQLNonNull(GraphQLBoolean)
    },
    userId: {
      type: new GraphQLNonNull(GraphQLID),
      description: "The ID of the AuthX user who will own this credential."
    },
    authorityId: {
      type: new GraphQLNonNull(GraphQLID),
      description:
        "The ID of the AuthX email authority that can verify this credential."
    },
    authorityUserId: {
      type: new GraphQLNonNull(GraphQLID),
      description: "The email address of the user."
    },
    proof: {
      type: GraphQLString,
      description:
        "This unique code is sent by the authority to prove ownership of the email address."
    }
  },
  async resolve(source, args, context): Promise<EmailCredential> {
    const { tx, token: t, realm, authorityMap } = context;

    if (!t) {
      throw new ForbiddenError(
        "You must be authenticated to create a credential."
      );
    }

    await tx.query("BEGIN DEFERRABLE");

    try {
      const id = v4();
      const authority = Authority.read(tx, args.authorityId, authorityMap);
      if (!(authority instanceof EmailAuthority)) {
        throw new NotFoundError("No email authority exists with this ID.");
      }

      const data = new EmailCredential({
        id,
        enabled: args.enabled,
        authorityId: args.authorityId,
        userId: args.userId,
        authorityUserId: args.userId,
        contact: null,
        details: {}
      });

      if (!(await t.can(tx, `${realm}:credential.user.*.*:write.*`))) {
        if (!(await data.isAccessibleBy(realm, t, tx, "write.*"))) {
          throw new ForbiddenError(
            "You do not have permission to create this credential."
          );
        }

        // The user doesn't have permission to change the credentials of all users,
        // so she needs to prove ownership of the email address.
        if (!args.proof) {
          throw new ForbiddenError(
            "You do not have permission to create this credential without a proof."
          );
        }

        if (!verify(args.proof)) {
          throw new ForbiddenError("The proof is invalid.");
        }
      }

      // Check if the email is used in a different credential, and if it is, disable it.
      const existingCredentials = await EmailCredential.read(
        tx,
        (await tx.query(
          `
          SELECT entity_id as id
          FROM authx.credential_record
          WHERE
            replacement_record_id IS NULL
            AND enabled = TRUE
            AND authority_id = $1
            AND authority_user_id = $2
          `,
          [authority.id, data.authorityUserId]
        )).rows.map(({ id }) => id)
      );

      if (existingCredentials.length > 1) {
        throw new Error(
          "INVARIANT: There cannot be more than one active credential with the same authorityId and authorityUserId."
        );
      }

      // Disable the conflicting credential
      if (existingCredentials.length === 1) {
        await EmailCredential.write(
          tx,
          {
            ...existingCredentials[0],
            enabled: false
          },
          {
            recordId: v4(),
            createdByTokenId: t.id,
            createdAt: new Date()
          }
        );
      }

      const credential = await EmailCredential.write(tx, data, {
        recordId: v4(),
        createdByTokenId: t.id,
        createdAt: new Date()
      });

      await tx.query("COMMIT");
      return credential;
    } catch (error) {
      await tx.query("ROLLBACK");
      throw error;
    }
  }
};
