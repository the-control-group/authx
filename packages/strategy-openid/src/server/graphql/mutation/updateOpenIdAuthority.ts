import v4 from "uuid/v4";
import {
  GraphQLBoolean,
  GraphQLFieldConfig,
  GraphQLID,
  GraphQLNonNull,
  GraphQLList,
  GraphQLString
} from "graphql";

import {
  Context,
  Authority,
  ForbiddenError,
  NotFoundError
} from "@authx/authx";
import { OpenIdAuthority } from "../../model";
import { GraphQLOpenIdAuthority } from "../GraphQLOpenIdAuthority";

export const updateOpenIdAuthority: GraphQLFieldConfig<
  any,
  {
    id: string;
    enabled: null | boolean;
    name: null | string;
    description: null | string;
    authUrl: null | string;
    tokenUrl: null | string;
    clientId: null | string;
    clientSecret: null | string;
    restrictToHostedDomains: null | string[];
    emailAuthorityId: null | string;
    matchUsersByEmail: null | boolean;
    createUnmatchedUsers: null | boolean;
    assignCreatedUsersToRoleIds: null | string[];
  },
  Context
> = {
  type: GraphQLOpenIdAuthority,
  description: "Update a new authority.",
  args: {
    id: {
      type: new GraphQLNonNull(GraphQLID)
    },
    enabled: {
      type: GraphQLBoolean
    },
    name: {
      type: GraphQLString,
      description: "The name of the authority."
    },
    description: {
      type: GraphQLString,
      description: "A description of the authority."
    },
    authUrl: {
      type: GraphQLString,
      description: "The URL to which a user is directed to authenticate."
    },
    tokenUrl: {
      type: GraphQLString,
      description:
        "The URL used by AuthX to exchange an authorization code for an access token."
    },
    clientId: {
      type: GraphQLString,
      description: "The client ID of AuthX in with OpenID provider."
    },
    clientSecret: {
      type: GraphQLString,
      description: "The AuthX client secret with the OpenID provider."
    },
    restrictToHostedDomains: {
      type: new GraphQLList(new GraphQLNonNull(GraphQLString)),
      description: "Restrict to accounts controlled by these hosted domains."
    },
    emailAuthorityId: {
      type: GraphQLString,
      description: "The ID of the email authority."
    },
    matchUsersByEmail: {
      type: GraphQLBoolean,
      description:
        "If no credential exists for the given OpenID provider, should we lookup the user by email address?"
    },
    createUnmatchedUsers: {
      type: GraphQLBoolean,
      description:
        "If no credential exists for the given OpenID provider, should we create a new one?"
    },
    assignCreatedUsersToRoleIds: {
      type: new GraphQLList(new GraphQLNonNull(GraphQLID)),
      description: "When a user is created, assign to these roles."
    }
  },
  async resolve(source, args, context): Promise<OpenIdAuthority> {
    const {
      tx,
      authorization: a,
      realm,
      strategies: { authorityMap }
    } = context;

    if (!a) {
      throw new ForbiddenError(
        "You must be authenticated to update an authority."
      );
    }

    await tx.query("BEGIN DEFERRABLE");

    try {
      const before = await Authority.read(tx, args.id, authorityMap);

      if (!(before instanceof OpenIdAuthority)) {
        throw new NotFoundError("No openid authority exists with this ID.");
      }

      if (!(await before.isAccessibleBy(realm, a, tx, "write.basic"))) {
        throw new ForbiddenError(
          "You do not have permission to update this authority."
        );
      }

      if (
        (typeof args.clientId === "string" ||
          typeof args.clientSecret === "string") &&
        !(await before.isAccessibleBy(realm, a, tx, "write.*"))
      ) {
        throw new ForbiddenError(
          "You do not have permission to update this authority's details."
        );
      }
      const authority = await OpenIdAuthority.write(
        tx,
        {
          ...before,
          enabled:
            typeof args.enabled === "boolean" ? args.enabled : before.enabled,
          name: typeof args.name === "string" ? args.name : before.name,
          description:
            typeof args.description === "string"
              ? args.description
              : before.description,
          details: {
            authUrl:
              typeof args.authUrl === "string"
                ? args.authUrl
                : before.details.authUrl,
            tokenUrl:
              typeof args.tokenUrl === "string"
                ? args.tokenUrl
                : before.details.tokenUrl,
            clientId:
              typeof args.clientId === "string"
                ? args.clientId
                : before.details.clientId,
            clientSecret:
              typeof args.clientSecret === "string"
                ? args.clientSecret
                : before.details.clientSecret,
            restrictToHostedDomains: Array.isArray(args.restrictToHostedDomains)
              ? args.restrictToHostedDomains
              : before.details.restrictToHostedDomains,
            emailAuthorityId:
              typeof args.emailAuthorityId === "string"
                ? args.emailAuthorityId === ""
                  ? null
                  : args.emailAuthorityId
                : before.details.emailAuthorityId,
            matchUsersByEmail:
              typeof args.matchUsersByEmail === "boolean"
                ? args.matchUsersByEmail
                : before.details.matchUsersByEmail,
            createUnmatchedUsers:
              typeof args.createUnmatchedUsers === "boolean"
                ? args.createUnmatchedUsers
                : before.details.createUnmatchedUsers,
            assignCreatedUsersToRoleIds: Array.isArray(
              args.assignCreatedUsersToRoleIds
            )
              ? args.assignCreatedUsersToRoleIds
              : before.details.assignCreatedUsersToRoleIds
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
    }
  }
};
