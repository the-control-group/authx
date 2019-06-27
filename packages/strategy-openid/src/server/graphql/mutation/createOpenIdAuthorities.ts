import v4 from "uuid/v4";
import { GraphQLFieldConfig, GraphQLNonNull, GraphQLList } from "graphql";

import {
  Context,
  ForbiddenError,
  ConflictError,
  NotFoundError
} from "@authx/authx";
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
      const tx = await pool.connect();
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
        const data = new OpenIdAuthority({
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
        });

        if (!(await data.isAccessibleBy(realm, a, tx, "write.*"))) {
          throw new ForbiddenError(
            "You do not have permission to create an authority."
          );
        }

        const authority = await OpenIdAuthority.write(tx, data, {
          recordId: v4(),
          createdByAuthorizationId: a.id,
          createdAt: new Date()
        });

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
