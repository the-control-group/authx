import v4 from "uuid/v4";
import {
  GraphQLBoolean,
  GraphQLFieldConfig,
  GraphQLID,
  GraphQLNonNull,
  GraphQLList,
  GraphQLInt,
  GraphQLString
} from "graphql";

import { Context } from "../../../../Context";
import { Authority } from "../../../../model";
import { OpenIdAuthority } from "../../model";
import { ForbiddenError, NotFoundError } from "../../../../errors";
import { GraphQLOpenIdAuthority } from "../GraphQLOpenIdAuthority";

export const updateOpenIdAuthority: GraphQLFieldConfig<
  any,
  {
    id: string;
    enabled: null | boolean;
    name: null | string;
    clientId: null | string;
    clientSecret: null | string;
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
    clientId: {
      type: GraphQLString,
      description: "The AuthX client ID for OpenId."
    },
    clientSecret: {
      type: GraphQLString,
      description: "The AuthX client secret for OpenId."
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
          details: {
            clientId:
              typeof args.clientId === "string"
                ? args.clientId
                : before.details.clientId,
            clientSecret:
              typeof args.clientSecret === "string"
                ? args.clientSecret
                : before.details.clientSecret
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
