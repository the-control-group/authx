import v4 from "uuid/v4";
import {
  GraphQLBoolean,
  GraphQLFieldConfig,
  GraphQLID,
  GraphQLNonNull,
  GraphQLInt,
  GraphQLString
} from "graphql";

import { Context } from "../../../../Context";
import { Authority } from "../../../../model";
import { PasswordAuthority } from "../../model";
import { ForbiddenError, NotFoundError } from "../../../../errors";
import { GraphQLPasswordAuthority } from "../GraphQLPasswordAuthority";

export const updatePasswordAuthority: GraphQLFieldConfig<
  any,
  {
    id: string;
    enabled: null | boolean;
    name: null | string;
    rounds: null | number;
  },
  Context
> = {
  type: GraphQLPasswordAuthority,
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
    rounds: {
      type: GraphQLInt,
      description:
        "The number of bcrypt rounds to use when generating new hashes."
    }
  },
  async resolve(source, args, context): Promise<PasswordAuthority> {
    const {
      tx,
      token: t,
      realm,
      strategies: { authorityMap }
    } = context;

    if (!t) {
      throw new ForbiddenError(
        "You must be authenticated to update an authority."
      );
    }

    await tx.query("BEGIN DEFERRABLE");

    try {
      const before = await Authority.read(tx, args.id, authorityMap);

      if (!(before instanceof PasswordAuthority)) {
        throw new NotFoundError("No password authority exists with this ID.");
      }

      if (!(await before.isAccessibleBy(realm, t, tx, "write.basic"))) {
        throw new ForbiddenError(
          "You do not have permission to update this authority."
        );
      }

      if (
        args.rounds &&
        !(await before.isAccessibleBy(realm, t, tx, "write.details"))
      ) {
        throw new ForbiddenError(
          "You do not have permission to update this authority's details."
        );
      }

      const authority = await PasswordAuthority.write(
        tx,
        {
          ...before,
          enabled:
            typeof args.enabled === "boolean" ? args.enabled : before.enabled,
          name: typeof args.name === "string" ? args.name : before.name,
          details: {
            ...before.details,
            rounds:
              typeof args.rounds === "number"
                ? args.rounds
                : before.details.rounds
          }
        },
        {
          recordId: v4(),
          createdByTokenId: t.id,
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
