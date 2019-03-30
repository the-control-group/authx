import v4 from "uuid/v4";
import {
  GraphQLBoolean,
  GraphQLFieldConfig,
  GraphQLNonNull,
  GraphQLInt,
  GraphQLString
} from "graphql";

import { Context } from "../../../../Context";
import { PasswordAuthority } from "../../model";
import { ForbiddenError } from "../../../../errors";
import { GraphQLPasswordAuthority } from "../GraphQLPasswordAuthority";

export const createPasswordAuthority: GraphQLFieldConfig<
  any,
  {
    enabled: boolean;
    name: string;
    rounds: number;
  },
  Context
> = {
  type: GraphQLPasswordAuthority,
  description: "Create a new password authority.",
  args: {
    enabled: {
      type: GraphQLBoolean,
      defaultValue: true
    },
    name: {
      type: new GraphQLNonNull(GraphQLString),
      description: "The name of the authority."
    },
    rounds: {
      type: GraphQLInt,
      defaultValue: 10,
      description:
        "The number of bcrypt rounds to use when generating new hashes."
    }
  },
  async resolve(source, args, context): Promise<PasswordAuthority> {
    const { tx, token: t, realm } = context;

    if (!t) {
      throw new ForbiddenError(
        "You must be authenticated to create a authority."
      );
    }

    await tx.query("BEGIN DEFERRABLE");
    try {
      const id = v4();
      const data = new PasswordAuthority({
        id,
        strategy: "password",
        enabled: args.enabled,
        name: args.name,
        details: {
          rounds: args.rounds
        }
      });

      if (!(await data.isAccessibleBy(realm, t, tx, "write.*"))) {
        throw new ForbiddenError(
          "You do not have permission to create an authority."
        );
      }

      const authority = await PasswordAuthority.write(tx, data, {
        recordId: v4(),
        createdByTokenId: t.id,
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
