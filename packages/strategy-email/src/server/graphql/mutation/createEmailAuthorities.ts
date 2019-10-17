import v4 from "uuid/v4";
import { GraphQLFieldConfig, GraphQLNonNull, GraphQLList } from "graphql";

import {
  Context,
  ForbiddenError,
  ConflictError,
  NotFoundError,
  ValidationError,
  Role,
  makeAdministrationScopes,
  validateIdFormat
} from "@authx/authx";
import { getIntersection, simplify, validate } from "@authx/scopes";
import { EmailAuthority } from "../../model";
import { GraphQLEmailAuthority } from "../GraphQLEmailAuthority";
import { GraphQLCreateEmailAuthorityInput } from "./GraphQLCreateEmailAuthorityInput";

export const createEmailAuthorities: GraphQLFieldConfig<
  any,
  {
    authorities: {
      id: null | string;
      enabled: boolean;
      name: string;
      description: string;
      privateKey: string;
      publicKeys: string[];
      proofValidityDuration: number;
      authenticationEmailSubject: string;
      authenticationEmailText: string;
      authenticationEmailHtml: string;
      verificationEmailSubject: string;
      verificationEmailText: string;
      verificationEmailHtml: string;
      administration: {
        roleId: string;
        scopes: string[];
      }[];
    }[];
  },
  Context
> = {
  type: new GraphQLList(GraphQLEmailAuthority),
  description: "Create a new email authority.",
  args: {
    authorities: {
      type: new GraphQLNonNull(
        new GraphQLList(new GraphQLNonNull(GraphQLCreateEmailAuthorityInput))
      )
    }
  },
  async resolve(source, args, context): Promise<Promise<EmailAuthority>[]> {
    const { pool, authorization: a, realm } = context;

    if (!a) {
      throw new ForbiddenError(
        "You must be authenticated to create a authority."
      );
    }

    return args.authorities.map(async input => {
      // Validate `id`.
      if (typeof input.id === "string" && !validateIdFormat(input.id)) {
        throw new ValidationError("The provided `id` is an invalid ID.");
      }

      // Validate `administration`.
      for (const { roleId, scopes } of input.administration) {
        if (!validateIdFormat(roleId)) {
          throw new ValidationError(
            "The provided `administration` list contains a `roleId` that is an invalid ID."
          );
        }

        for (const scope of scopes) {
          if (!validate(scope)) {
            throw new ValidationError(
              "The provided `administration` list contains a `scopes` list with an invalid scope."
            );
          }
        }
      }

      const tx = await pool.connect();
      try {
        if (!(await a.can(tx, `${realm}:authority.:write.create`))) {
          throw new ForbiddenError(
            "You do not have permission to create an authority."
          );
        }

        try {
          await tx.query("BEGIN DEFERRABLE");

          // Make sure the ID isn't already in use.
          if (input.id) {
            try {
              await EmailAuthority.read(tx, input.id, { forUpdate: true });
              throw new ConflictError();
            } catch (error) {
              if (!(error instanceof NotFoundError)) {
                throw error;
              }
            }
          }

          const id = v4();
          const authority = await EmailAuthority.write(
            tx,
            {
              id,
              strategy: "email",
              enabled: input.enabled,
              name: input.name,
              description: input.description,
              details: {
                privateKey: input.privateKey,
                publicKeys: input.publicKeys,
                proofValidityDuration: input.proofValidityDuration,
                authenticationEmailSubject: input.authenticationEmailSubject,
                authenticationEmailText: input.authenticationEmailText,
                authenticationEmailHtml: input.authenticationEmailHtml,
                verificationEmailSubject: input.verificationEmailSubject,
                verificationEmailText: input.verificationEmailText,
                verificationEmailHtml: input.verificationEmailHtml
              }
            },
            {
              recordId: v4(),
              createdByAuthorizationId: a.id,
              createdAt: new Date()
            }
          );

          const possibleAdministrationScopes = makeAdministrationScopes(
            await a.access(tx),
            realm,
            "client",
            id,
            ["read.basic", "read.details", "write.basic", "write.details"]
          );

          // Add administration scopes.
          for (const { roleId, scopes } of input.administration) {
            const role = await Role.read(tx, roleId, { forUpdate: true });

            if (!role.can(tx, "write.scopes")) {
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
                  ...getIntersection(possibleAdministrationScopes, scopes)
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
          return authority;
        } catch (error) {
          await tx.query("ROLLBACK");
          throw error;
        }
      } finally {
        tx.release();
      }
    });
  }
};
