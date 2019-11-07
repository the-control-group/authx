import v4 from "uuid/v4";
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
  makeAdministrationScopes,
  validateIdFormat
} from "@authx/authx";
import { getIntersection, simplify, isValidScopeLiteral } from "@authx/scopes";
import { PasswordCredential, PasswordAuthority } from "../../model";
import { GraphQLPasswordCredential } from "../GraphQLPasswordCredential";
import { GraphQLCreatePasswordCredentialInput } from "./GraphQLCreatePasswordCredentialInput";

export const createPasswordCredentials: GraphQLFieldConfig<
  any,
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
  },
  Context
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

      /* eslint-disable @typescript-eslint/camelcase */
      const values: { [name: string]: string } = {
        current_authorization_id: a.id,
        current_user_id: a.userId,
        ...(a.grantId ? { current_grant_id: a.grantId } : null)
      };
      /* eslint-enable @typescript-eslint/camelcase */

      const tx = await pool.connect();
      try {
        if (
          !(await a.can(tx, values, `${realm}:credential.:write.create`)) &&
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

          const possibleAdministrationScopes = makeAdministrationScopes(
            await a.access(tx, values),
            realm,
            "grant",
            id,
            ["read.basic", "read.details", "write.basic", "write.details"]
          );

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
