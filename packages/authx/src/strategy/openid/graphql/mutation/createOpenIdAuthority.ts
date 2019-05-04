import v4 from "uuid/v4";
import {
  GraphQLBoolean,
  GraphQLFieldConfig,
  GraphQLNonNull,
  GraphQLString
} from "graphql";

import { Context } from "../../../../Context";
import { OpenIdAuthority } from "../../model";
import { ForbiddenError } from "../../../../errors";
import { GraphQLOpenIdAuthority } from "../GraphQLOpenIdAuthority";

export const createOpenIdAuthority: GraphQLFieldConfig<
  any,
  {
    enabled: boolean;
    name: string;
    authorizationCodeUrl: string;
    clientId: string;
    clientSecret: string;
    url: string;
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
    authorizationCodeUrl: {
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
      description: "The AuthX client secret for OpenId."
    },
    url: {
      type: new GraphQLNonNull(GraphQLString),
      description: "The URL to which a user is directed to authenticate."
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
        details: {
          clientId: args.clientId,
          clientSecret: args.clientSecret
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
