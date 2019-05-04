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
    clientId: string;
    clientSecret: string;
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
    clientId: {
      type: new GraphQLNonNull(GraphQLString),
      description: "The AuthX client ID for OpenId."
    },
    clientSecret: {
      type: new GraphQLNonNull(GraphQLString),
      description: "The AuthX client secret for OpenId."
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
