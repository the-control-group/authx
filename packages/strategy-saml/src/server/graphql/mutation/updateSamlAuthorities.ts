import v4 from "uuid/v4";
import { GraphQLFieldConfig, GraphQLNonNull, GraphQLList } from "graphql";

import {
  Context,
  Authority,
  ForbiddenError,
  NotFoundError
} from "@authx/authx";
import { SamlAuthority } from "../../model";
import { GraphQLSamlAuthority } from "../GraphQLSamlAuthority";
import { GraphQLUpdateSamlAuthorityInput } from "./GraphQLUpdateSamlAuthorityInput";

export const updateSamlAuthorities: GraphQLFieldConfig<
  any,
  Context,
  {
    authorities: {
      id: string;
      enabled: null | boolean;
      name: null | string;
      description: null | string;
      authUrl: null | string;
      tokenUrl: null | string;
      clientId: null | string;
      clientSecret: null | string;
      restrictsAccountsToHostedDomains: null | string[];
      emailAuthorityId: null | string;
      matchesUsersByEmail: null | boolean;
      createsUnmatchedUsers: null | boolean;
      assignsCreatedUsersToRoleIds: null | string[];
    }[];
  }
> = {
  type: new GraphQLList(GraphQLSamlAuthority),
  description: "Update a new authority.",
  args: {
    authorities: {
      type: new GraphQLNonNull(
        new GraphQLList(new GraphQLNonNull(GraphQLUpdateSamlAuthorityInput))
      )
    }
  },
  async resolve(source, args, context): Promise<Promise<SamlAuthority>[]> {
    const {
      pool,
      authorization: a,
      realm,
      strategies: { authorityMap }
    } = context;

    if (!a) {
      throw new ForbiddenError(
        "You must be authenticated to update an authority."
      );
    }

    return args.authorities.map(async input => {
      const tx = await pool.connect();
      try {
        await tx.query("BEGIN DEFERRABLE");

        const before = await Authority.read(tx, input.id, authorityMap, {
          forUpdate: true
        });

        if (!(before instanceof SamlAuthority)) {
          throw new NotFoundError("No openid authority exists with this ID.");
        }

        if (!(await before.isAccessibleBy(realm, a, tx, "write.basic"))) {
          throw new ForbiddenError(
            "You do not have permission to update this authority."
          );
        }

        if (
          (typeof input.clientId === "string" ||
            typeof input.clientSecret === "string") &&
          !(await before.isAccessibleBy(realm, a, tx, "write.*"))
        ) {
          throw new ForbiddenError(
            "You do not have permission to update this authority's details."
          );
        }
        const authority = await SamlAuthority.write(
          tx,
          {
            ...before,
            enabled:
              typeof input.enabled === "boolean"
                ? input.enabled
                : before.enabled,
            name: typeof input.name === "string" ? input.name : before.name,
            description:
              typeof input.description === "string"
                ? input.description
                : before.description,
            details: {
              authUrl:
                typeof input.authUrl === "string"
                  ? input.authUrl
                  : before.details.authUrl,
              tokenUrl:
                typeof input.tokenUrl === "string"
                  ? input.tokenUrl
                  : before.details.tokenUrl,
              clientId:
                typeof input.clientId === "string"
                  ? input.clientId
                  : before.details.clientId,
              clientSecret:
                typeof input.clientSecret === "string"
                  ? input.clientSecret
                  : before.details.clientSecret,
              restrictsAccountsToHostedDomains: Array.isArray(
                input.restrictsAccountsToHostedDomains
              )
                ? input.restrictsAccountsToHostedDomains
                : before.details.restrictsAccountsToHostedDomains,
              emailAuthorityId:
                typeof input.emailAuthorityId === "string"
                  ? input.emailAuthorityId === ""
                    ? null
                    : input.emailAuthorityId
                  : before.details.emailAuthorityId,
              matchesUsersByEmail:
                typeof input.matchesUsersByEmail === "boolean"
                  ? input.matchesUsersByEmail
                  : before.details.matchesUsersByEmail,
              createsUnmatchedUsers:
                typeof input.createsUnmatchedUsers === "boolean"
                  ? input.createsUnmatchedUsers
                  : before.details.createsUnmatchedUsers,
              assignsCreatedUsersToRoleIds: Array.isArray(
                input.assignsCreatedUsersToRoleIds
              )
                ? input.assignsCreatedUsersToRoleIds
                : before.details.assignsCreatedUsersToRoleIds
            }
          },
          {
            recordId: v4(),
            createdByAuthorizationId: a.id,
            createdAt: new Date()
          }
        );

        await tx.query("COMMIT");
        return authority;
      } catch (error) {
        await tx.query("ROLLBACK");
        throw error;
      } finally {
        tx.release();
      }
    });
  }
};
