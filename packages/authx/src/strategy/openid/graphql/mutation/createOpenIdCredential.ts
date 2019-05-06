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
import { OpenIdCredential, OpenIdAuthority } from "../../model";
import { ForbiddenError, NotFoundError } from "../../../../errors";
import { GraphQLOpenIdCredential } from "../GraphQLOpenIdCredential";

export const createOpenIdCredential: GraphQLFieldConfig<
  any,
  {
    enabled: boolean;
    userId: string;
    authorityId: string;
    openid: string;
    proof: null | string;
  },
  Context
> = {
  type: GraphQLOpenIdCredential,
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
        "The ID of the AuthX openid authority that can verify this credential."
    },
    openid: {
      type: new GraphQLNonNull(GraphQLID),
      description: "The openid address of the user."
    },
    proof: {
      type: GraphQLString,
      description:
        "This is a unique code that was sent by the authority to prove control of the openid address."
    }
  },
  async resolve(source, args, context): Promise<OpenIdCredential> {
    const {
      tx,
      authorization: a,
      realm,
      strategies: { authorityMap },
      sendMail,
      base
    } = context;

    if (!a) {
      throw new ForbiddenError(
        "You must be authenticated to create a credential."
      );
    }

    await tx.query("BEGIN DEFERRABLE");

    try {
      const id = v4();
      const authority = await Authority.read(
        tx,
        args.authorityId,
        authorityMap
      );
      if (!(authority instanceof OpenIdAuthority)) {
        throw new NotFoundError("No openid authority exists with this ID.");
      }

      const data = new OpenIdCredential({
        id,
        enabled: args.enabled,
        authorityId: args.authorityId,
        userId: args.userId,
        authorityUserId: args.openid,
        details: {}
      });

      // Check if the openid is used in a different credential
      const existingCredentials = await OpenIdCredential.read(
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

      if (!(await a.can(tx, `${realm}:credential.user.*.*:write.*`))) {
        if (!(await data.isAccessibleBy(realm, a, tx, "write.*"))) {
          throw new ForbiddenError(
            "You do not have permission to create this credential."
          );
        }

        // The user doesn't have permission to change the credentials of all
        // users, but has passed a proof that she controls the openid address, so
        // we can treat it as hers.
        const { proof } = args;
        if (proof) {
          if (
            !authority.details.publicKeys.some(key => {
              try {
                const payload = jwt.verify(proof, key, {
                  algorithms: ["RS512"]
                });

                // Make sure we're using the same openid
                if ((payload as any).openid !== args.openid) {
                  throw new ForbiddenError(
                    "This proof was generated for a different openid address."
                  );
                }

                // Make sure this is for the same user
                if ((payload as any).sub !== a.userId) {
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
        // users, so she needs to prove control of the openid address.
        else {
          const proofId = v4();

          // Generate a new proof
          const proof = jwt.sign(
            {
              openid: args.openid
            },
            authority.details.privateKey,
            {
              algorithm: "RS512",
              expiresIn: authority.details.proofValidityDuration,
              subject: a.userId,
              jwtid: proofId
            }
          );

          const url =
            base +
            `?authorityId=${authority.id}&proof=${encodeURIComponent(base)}`;

          // TODO: Add a code to any existing credential with the same address

          // Send an openid
          await sendMail({
            to: args.openid,
            subject: authority.details.verificationOpenIdSubject,
            text: substitute(
              { proof, url },
              authority.details.verificationOpenIdText
            ),
            html: substitute(
              { proof, url },
              authority.details.verificationOpenIdHtml
            )
          });

          throw new ForbiddenError(
            "An openid has been sent to this address with a code that can be used to prove control."
          );
        }
      }

      // Disable the conflicting credential
      if (existingCredentials.length === 1) {
        await OpenIdCredential.write(
          tx,
          {
            ...existingCredentials[0],
            enabled: false
          },
          {
            recordId: v4(),
            createdByAuthorizationId: a.id,
            createdAt: new Date()
          }
        );
      }

      const credential = await OpenIdCredential.write(tx, data, {
        recordId: v4(),
        createdByAuthorizationId: a.id,
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
