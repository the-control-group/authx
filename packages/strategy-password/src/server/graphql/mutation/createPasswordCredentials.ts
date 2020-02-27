import { v4 } from "uuid";
import { hash } from "bcrypt";
import { GraphQLList, GraphQLFieldConfig, GraphQLNonNull } from "graphql";

import {
  Context,
  Authority,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  ValidationError,
  Role,
  validateIdFormat
} from "@authx/authx";

import { createV2AuthXScope } from "@authx/authx/scopes";

import { isSuperset, simplify, isValidScopeLiteral } from "@authx/scopes";
import { PasswordCredential, PasswordAuthority } from "../../model";
import { GraphQLPasswordCredential } from "../GraphQLPasswordCredential";
import { GraphQLCreatePasswordCredentialInput } from "./GraphQLCreatePasswordCredentialInput";

export const createPasswordCredentials: GraphQLFieldConfig<
  any,
  Context,
  {
    credentials: {
      id: null | string;
      enabled: boolean;
      authorityId: string;
      userId: string;
      password: string;
      administration: {
        roleId: string;
        scopes: string[];
      }[];
    }[];
  }
> = {
  type: new GraphQLList(GraphQLPasswordCredential),
  description: "Create a new credential.",
  args: {
    credentials: {
      type: new GraphQLNonNull(
        new GraphQLList(
          new GraphQLNonNull(GraphQLCreatePasswordCredentialInput)
        )
      )
    }
  },
  async resolve(source, args, context): Promise<Promise<PasswordCredential>[]> {
    const {
      pool,
      authorization: a,
      realm,
      strategies: { authorityMap }
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

      const tx = await pool.connect();
      try {
        // The user cannot create a credential for this user and authority.
        if (
          !(await a.can(
            tx,
            createV2AuthXScope(
              realm,
              {
                type: "credential",
                credentialId: "",
                authorityId: input.authorityId,
                userId: input.userId
              },
              {
                basic: "*",
                details: "*"
              }
            )
          ))
        ) {
          throw new ForbiddenError(
            "You do not have permission to create this credential."
          );
        }

        try {
          await tx.query("BEGIN DEFERRABLE");

          // Make sure the ID isn't already in use.
          if (input.id) {
            try {
              await PasswordCredential.read(tx, input.id, { forUpdate: true });
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
            authorityMap
          );
          if (!(authority instanceof PasswordAuthority)) {
            throw new NotFoundError(
              "No password authority exists with this ID."
            );
          }

          const credential = await PasswordCredential.write(
            tx,
            {
              id,
              enabled: input.enabled,
              authorityId: input.authorityId,
              userId: input.userId,
              authorityUserId: input.userId,
              details: {
                hash: await hash(input.password, authority.details.rounds)
              }
            },
            {
              recordId: v4(),
              createdByAuthorizationId: a.id,
              createdAt: new Date()
            }
          );

          const possibleAdministrationScopes = [
            createV2AuthXScope(
              realm,
              {
                type: "credential",
                authorityId: credential.authorityId,
                credentialId: id,
                userId: credential.userId
              },
              {
                basic: "r",
                details: ""
              }
            ),
            createV2AuthXScope(
              realm,
              {
                type: "credential",
                authorityId: credential.authorityId,
                credentialId: id,
                userId: credential.userId
              },
              {
                basic: "r",
                details: "r"
              }
            ),
            createV2AuthXScope(
              realm,
              {
                type: "credential",
                authorityId: credential.authorityId,
                credentialId: id,
                userId: credential.userId
              },
              {
                basic: "r",
                details: "*"
              }
            ),
            createV2AuthXScope(
              realm,
              {
                type: "credential",
                authorityId: credential.authorityId,
                credentialId: id,
                userId: credential.userId
              },
              {
                basic: "w",
                details: ""
              }
            ),
            createV2AuthXScope(
              realm,
              {
                type: "credential",
                authorityId: credential.authorityId,
                credentialId: id,
                userId: credential.userId
              },
              {
                basic: "w",
                details: "w"
              }
            ),
            createV2AuthXScope(
              realm,
              {
                type: "credential",
                authorityId: credential.authorityId,
                credentialId: id,
                userId: credential.userId
              },
              {
                basic: "w",
                details: "*"
              }
            ),
            createV2AuthXScope(
              realm,
              {
                type: "credential",
                authorityId: credential.authorityId,
                credentialId: id,
                userId: credential.userId
              },
              {
                basic: "*",
                details: "*"
              }
            )
          ];

          // Add administration scopes.
          for (const { roleId, scopes } of input.administration) {
            const role = await Role.read(tx, roleId, { forUpdate: true });

            if (
              !role.isAccessibleBy(realm, a, tx, {
                basic: "w",
                scopes: "w",
                users: ""
              })
            ) {
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
        }
      } finally {
        tx.release();
      }
    });
  }
};
