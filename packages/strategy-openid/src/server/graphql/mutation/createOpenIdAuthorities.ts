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
import { OpenIdAuthority } from "../../model";
import { GraphQLOpenIdAuthority } from "../GraphQLOpenIdAuthority";
import { GraphQLCreateOpenIdAuthorityInput } from "./GraphQLCreateOpenIdAuthorityInput";

export const createOpenIdAuthorities: GraphQLFieldConfig<
  any,
  {
    authorities: {
      id: null | string;
      enabled: boolean;
      name: string;
      description: string;
      authUrl: string;
      tokenUrl: string;
      clientId: string;
      clientSecret: string;
      restrictsAccountsToHostedDomains: string[];
      emailAuthorityId: null | string;
      matchesUsersByEmail: boolean;
      createsUnmatchedUsers: boolean;
      assignsCreatedUsersToRoleIds: string[];
      administration: {
        roleId: string;
        scopes: string[];
      }[];
    }[];
  },
  Context
> = {
  type: new GraphQLList(GraphQLOpenIdAuthority),
  description: "Create a new openid authority.",
  args: {
    authorities: {
      type: new GraphQLNonNull(
        new GraphQLList(new GraphQLNonNull(GraphQLCreateOpenIdAuthorityInput))
      )
    }
  },
  async resolve(source, args, context): Promise<Promise<OpenIdAuthority>[]> {
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
              await OpenIdAuthority.read(tx, input.id, { forUpdate: true });
              throw new ConflictError();
            } catch (error) {
              if (!(error instanceof NotFoundError)) {
                throw error;
              }
            }
          }

          const id = v4();
          const authority = await OpenIdAuthority.write(
            tx,
            {
              id,
              strategy: "openid",
              enabled: input.enabled,
              name: input.name,
              description: input.description,
              details: {
                authUrl: input.authUrl,
                tokenUrl: input.tokenUrl,
                clientId: input.clientId,
                clientSecret: input.clientSecret,
                restrictsAccountsToHostedDomains:
                  input.restrictsAccountsToHostedDomains,
                emailAuthorityId: input.emailAuthorityId,
                matchesUsersByEmail: input.matchesUsersByEmail,
                createsUnmatchedUsers: input.createsUnmatchedUsers,
                assignsCreatedUsersToRoleIds: input.assignsCreatedUsersToRoleIds
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
