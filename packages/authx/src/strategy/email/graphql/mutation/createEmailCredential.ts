import v4 from "uuid/v4";
import jwt from "jsonwebtoken";
import {
  GraphQLBoolean,
  GraphQLFieldConfig,
  GraphQLID,
  GraphQLNonNull,
  GraphQLString
} from "graphql";

import { Context } from "../../../../Context";
import { Authority } from "../../../../model";
import { EmailCredential, EmailAuthority } from "../../model";
import { ForbiddenError, NotFoundError } from "../../../../errors";
import { GraphQLEmailCredential } from "../GraphQLEmailCredential";
import { substitute } from "../../substitute";

export const createEmailCredential: GraphQLFieldConfig<
  any,
  {
    enabled: boolean;
    userId: string;
    authorityId: string;
    email: string;
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
    email: {
      type: new GraphQLNonNull(GraphQLID),
      description: "The email address of the user."
    },
    proof: {
      type: GraphQLString,
      description:
        "This is a unique code that was sent by the authority to prove control of the email address."
    }
  },
  async resolve(source, args, context): Promise<EmailCredential> {
    const {
      tx,
      token: t,
      realm,
      strategies: { authorityMap },
      sendMail,
      interfaceBaseUrl
    } = context;

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
        authorityUserId: args.email,
        contact: null,
        details: {}
      });

      // Check if the email is used in a different credential
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

      if (!(await t.can(tx, `${realm}:credential.user.*.*:write.*`))) {
        if (!(await data.isAccessibleBy(realm, t, tx, "write.*"))) {
          throw new ForbiddenError(
            "You do not have permission to create this credential."
          );
        }

        // The user doesn't have permission to change the credentials of all
        // users, but has passed a proof that she controls the email address, so
        // we can treat it as hers.
        const { proof } = args;
        if (proof) {
          if (
            !authority.details.publicKeys.some(key => {
              try {
                const payload = jwt.verify(proof, key, {
                  algorithms: ["RS512"]
                });

                // Make sure we're using the same email
                if ((payload as any).email !== args.email) {
                  throw new ForbiddenError(
                    "This proof was generated for a different email address."
                  );
                }

                // Make sure this is for the same user
                if ((payload as any).sub !== t.userId) {
                  throw new ForbiddenError(
                    "This proof was generated for a different user."
                  );
                }

                return true;
              } catch (error) {
                if (error instanceof ForbiddenError) {
                  throw error;
                }

                return false;
              }
            })
          ) {
            throw new ForbiddenError("The proof is invalid.");
          }
        }

        // The user doesn't have permission to change the credentials of all
        // users, so she needs to prove control of the email address.
        else {
          const proofId = v4();

          // Generate a new proof
          const proof = jwt.sign(
            {
              email: args.email
            },
            authority.details.privateKey,
            {
              algorithm: "RS512",
              expiresIn: authority.details.proofValidityDuration,
              subject: t.userId,
              jwtid: proofId
            }
          );

          const url =
            interfaceBaseUrl +
            `authenticate?authorityId=${
              authority.id
            }&proof=${encodeURIComponent(interfaceBaseUrl)}`;

          // TODO: Add a code to any existing credential with the same address

          // Send an email
          await sendMail({
            to: args.email,
            subject: authority.details.verificationEmailSubject,
            text: substitute(
              { proof, url },
              authority.details.verificationEmailText
            ),
            html: substitute(
              { proof, url },
              authority.details.verificationEmailHtml
            )
          });

          throw new ForbiddenError(
            "An email has been sent to this address with a code that can be used to prove control."
          );
        }
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
