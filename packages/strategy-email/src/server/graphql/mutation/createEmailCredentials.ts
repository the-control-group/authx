import v4 from "uuid/v4";
import jwt from "jsonwebtoken";
import { GraphQLFieldConfig, GraphQLNonNull, GraphQLList } from "graphql";

import {
  Context,
  Authority,
  ForbiddenError,
  ConflictError,
  NotFoundError,
  ValidationError,
  Role,
  validateIdFormat
} from "@authx/authx";
import { isSuperset, simplify, isValidScopeLiteral } from "@authx/scopes";
import { EmailCredential, EmailAuthority } from "../../model";
import { GraphQLEmailCredential } from "../GraphQLEmailCredential";
import { substitute } from "../../substitute";
import { GraphQLCreateEmailCredentialInput } from "./GraphQLCreateEmailCredentialInput";

export const createEmailCredentials: GraphQLFieldConfig<
  any,
  {
    credentials: {
      id: null | string;
      enabled: boolean;
      userId: string;
      authorityId: string;
      email: string;
      proof: null | string;
      administration: {
        roleId: string;
        scopes: string[];
      }[];
    }[];
  },
  Context
> = {
  type: new GraphQLList(GraphQLEmailCredential),
  description: "Create a new credential.",
  args: {
    credentials: {
      type: new GraphQLNonNull(
        new GraphQLList(new GraphQLNonNull(GraphQLCreateEmailCredentialInput))
      )
    }
  },
  async resolve(source, args, context): Promise<Promise<EmailCredential>[]> {
    const {
      pool,
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

    return args.credentials.map(async input => {
      // Validate `id`.
      if (typeof input.id === "string" && !validateIdFormat(input.id)) {
        throw new ValidationError("The provided `id` is an invalid ID.");
      }

      // Validate `authorityId`.
      if (!validateIdFormat(input.authorityId)) {
        throw new ValidationError(
          "The provided `authorityId` is an invalid ID."
        );
      }

      // Validate `userId`.
      if (!validateIdFormat(input.userId)) {
        throw new ValidationError("The provided `userId` is an invalid ID.");
      }

      // Validate `administration`.
      for (const { roleId, scopes } of input.administration) {
        if (!validateIdFormat(roleId)) {
          throw new ValidationError(
            "The provided `administration` list contains a `roleId` that is an invalid ID."
          );
        }

        for (const scope of scopes) {
          if (!isValidScopeLiteral(scope)) {
            throw new ValidationError(
              "The provided `administration` list contains a `scopes` list with an invalid scope."
            );
          }
        }
      }

      /* eslint-disable @typescript-eslint/camelcase */
      const values: { [name: string]: string } = {
        current_authorization_id: a.id,
        current_user_id: a.userId,
        ...(a.grantId ? { current_grant_id: a.grantId } : null)
      };
      /* eslint-enable @typescript-eslint/camelcase */

      const tx = await pool.connect();
      try {
        await tx.query("BEGIN DEFERRABLE");

        // Make sure the ID isn't already in use.
        if (input.id) {
          try {
            await EmailCredential.read(tx, input.id, { forUpdate: true });
            throw new ConflictError();
          } catch (error) {
            if (!(error instanceof NotFoundError)) {
              throw error;
            }
          }
        }

        const id = input.id || v4();
        const authority = await Authority.read(
          tx,
          input.authorityId,
          authorityMap,
          { forUpdate: true }
        );
        if (!(authority instanceof EmailAuthority)) {
          throw new NotFoundError("No email authority exists with this ID.");
        }

        // Check if the email is used in a different credential
        const existingCredentials = await EmailCredential.read(
          tx,
          (
            await tx.query(
              `
          SELECT entity_id as id
          FROM authx.credential_record
          WHERE
            replacement_record_id IS NULL
            AND enabled = TRUE
            AND authority_id = $1
            AND authority_user_id = $2
          FOR UPDATE
          `,
              [authority.id, input.email]
            )
          ).rows.map(({ id }) => id)
        );

        if (existingCredentials.length > 1) {
          throw new Error(
            "INVARIANT: There cannot be more than one active credential with the same authorityId and authorityUserId."
          );
        }

        if (!(await a.can(tx, values, `${realm}:credential.:write.create`))) {
          if (
            !(await a.can(
              tx,
              values,
              `${realm}:user.${input.userId}.credentials:write.create`
            )) &&
            !(await a.can(
              tx,
              values,
              `${realm}:authority.${input.authorityId}.credentials:write.create`
            ))
          ) {
            throw new ForbiddenError(
              "You do not have permission to create this credential."
            );
          }
        }

        if (
          !(await a.can(tx, values, `${realm}:credential.*:write.create`)) &&
          !(await a.can(
            tx,
            values,
            `${realm}:authority.*.credentials:write.create`
          )) &&
          !(await a.can(tx, values, `${realm}:user.*.credentials:write.create`))
        ) {
          // The user doesn't have permission to change the credentials of all
          // users, but has passed a proof that she controls the email address, so
          // we can treat it as hers.
          const { proof } = input;
          if (proof) {
            if (
              !authority.details.publicKeys.some(key => {
                try {
                  const payload = jwt.verify(proof, key, {
                    algorithms: ["RS512"]
                  });

                  // Make sure we're using the same email
                  if ((payload as any).email !== input.email) {
                    throw new ForbiddenError(
                      "This proof was generated for a different email address."
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
          // users, so she needs to prove control of the email address.
          else {
            const proofId = v4();

            // Generate a new proof
            const proof = jwt.sign(
              {
                email: input.email
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

            // Send an email
            await sendMail({
              to: input.email,
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
              createdByAuthorizationId: a.id,
              createdAt: new Date()
            }
          );
        }

        const credential = await EmailCredential.write(
          tx,
          {
            id,
            enabled: input.enabled,
            authorityId: input.authorityId,
            userId: input.userId,
            authorityUserId: input.email,
            details: {}
          },
          {
            recordId: v4(),
            createdByAuthorizationId: a.id,
            createdAt: new Date()
          }
        );

        const possibleAdministrationScopes = [
          `${realm}:v2.credential.${credential.authorityId}...${id}...${credential.userId}:r....`,
          `${realm}:v2.credential.${credential.authorityId}...${id}...${credential.userId}:r.r...`,
          `${realm}:v2.credential.${credential.authorityId}...${id}...${credential.userId}:r.*...`,
          `${realm}:v2.credential.${credential.authorityId}...${id}...${credential.userId}:w....`,
          `${realm}:v2.credential.${credential.authorityId}...${id}...${credential.userId}:w.w...`,
          `${realm}:v2.credential.${credential.authorityId}...${id}...${credential.userId}:w.*...`,
          `${realm}:v2.credential.${credential.authorityId}...${id}...${credential.userId}:*.*...`
        ];

        // Add administration scopes.
        for (const { roleId, scopes } of input.administration) {
          const role = await Role.read(tx, roleId, { forUpdate: true });

          if (!role.isAccessibleBy(realm, a, tx, "write.scopes")) {
            throw new ForbiddenError(
              `You do not have permission to modify the scopes of role ${roleId}.`
            );
          }

          await Role.write(
            tx,
            {
              ...role,
              scopes: simplify([
                ...role.scopes,
                ...possibleAdministrationScopes.filter(possible =>
                  isSuperset(scopes, possible)
                )
              ])
            },
            {
              recordId: v4(),
              createdByAuthorizationId: a.id,
              createdAt: new Date()
            }
          );
        }

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
