import v4 from "uuid/v4";
import {
  GraphQLBoolean,
  GraphQLFieldConfig,
  GraphQLNonNull,
  GraphQLString,
  GraphQLID,
  GraphQLList
} from "graphql";

import { Context, ForbiddenError } from "@authx/authx";
import { OpenIdAuthority } from "../../model";
import { GraphQLOpenIdAuthority } from "../GraphQLOpenIdAuthority";

export const createOpenIdAuthority: GraphQLFieldConfig<
  any,
  {
    enabled: boolean;
    name: string;
    description: string;
    authUrl: string;
    tokenUrl: string;
    clientId: string;
    clientSecret: string;
    restrictToHostedDomains: string[];
    emailAuthorityId: null | string;
    matchUsersByEmail: boolean;
    createUnmatchedUsers: boolean;
    assignCreatedUsersToRoleIds: string[];
  },
  Context
> = {
  type: GraphQLOpenIdAuthority,
  description: "Create a new openid authority.",
  args: {
    enabled: {
      type: GraphQLBoolean,
      defaultValue: true
    },
    name: {
      type: new GraphQLNonNull(GraphQLString),
      description: "The name of the authority."
    },
    description: {
      type: new GraphQLNonNull(GraphQLString),
      description: "A description of the authority."
    },
    authUrl: {
      type: new GraphQLNonNull(GraphQLString),
      description: "The URL to which a user is directed to authenticate."
    },
    tokenUrl: {
      type: new GraphQLNonNull(GraphQLString),
      description:
        "The URL used by AuthX to exchange an authorization code for an access token."
    },
    clientId: {
      type: new GraphQLNonNull(GraphQLString),
      description: "The client ID of AuthX in with OpenID provider."
    },
    clientSecret: {
      type: new GraphQLNonNull(GraphQLString),
      description: "The AuthX client secret with the OpenID provider."
    },
    restrictToHostedDomains: {
      type: new GraphQLNonNull(
        new GraphQLList(new GraphQLNonNull(GraphQLString))
      ) as any,
      description: "Restrict to accounts controlled by these hosted domains.",
      defaultValue: []
    },
    emailAuthorityId: {
      type: GraphQLID,
      description: "The ID of the email authority."
    },
    matchUsersByEmail: {
      type: GraphQLBoolean,
      description:
        "If no credential exists for the given OpenID provider, should we lookup the user by email address?",
      defaultValue: false
    },
    createUnmatchedUsers: {
      type: GraphQLBoolean,
      description:
        "If no credential exists for the given OpenID provider, should we create a new one?",
      defaultValue: false
    },
    assignCreatedUsersToRoleIds: {
      type: new GraphQLNonNull(
        new GraphQLList(new GraphQLNonNull(GraphQLID))
      ) as any,
      description: "When a user is created, assign to these roles.",
      defaultValue: []
    }
  },
  async resolve(source, args, context): Promise<OpenIdAuthority> {
    const { tx, authorization: a, realm } = context;

    if (!a) {
      throw new ForbiddenError(
        "You must be authenticated to create a authority."
      );
    }

    await tx.query("BEGIN DEFERRABLE");
    try {
      const id = v4();
      const data = new OpenIdAuthority({
        id,
        strategy: "openid",
        enabled: args.enabled,
        name: args.name,
        description: args.description,
        details: {
          authUrl: args.authUrl,
          tokenUrl: args.tokenUrl,
          clientId: args.clientId,
          clientSecret: args.clientSecret,
          restrictToHostedDomains: args.restrictToHostedDomains,
          emailAuthorityId: args.emailAuthorityId,
          matchUsersByEmail: args.matchUsersByEmail,
          createUnmatchedUsers: args.createUnmatchedUsers,
          assignCreatedUsersToRoleIds: args.assignCreatedUsersToRoleIds
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
    }
  }
};
