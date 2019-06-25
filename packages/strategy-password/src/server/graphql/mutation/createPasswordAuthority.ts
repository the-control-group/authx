import v4 from "uuid/v4";
import {
  GraphQLBoolean,
  GraphQLFieldConfig,
  GraphQLNonNull,
  GraphQLInt,
  GraphQLString
} from "graphql";

import { Context, ForbiddenError } from "@authx/authx";
import { PasswordAuthority } from "../../model";
import { GraphQLPasswordAuthority } from "../GraphQLPasswordAuthority";

export const createPasswordAuthority: GraphQLFieldConfig<
  any,
  {
    enabled: boolean;
    name: string;
    description: string;
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
    description: {
      type: new GraphQLNonNull(GraphQLString),
      description: "A description of the authority."
    },
    rounds: {
      type: GraphQLInt,
      defaultValue: 10,
      description:
        "The number of bcrypt rounds to use when generating new hashes."
    }
  },
  async resolve(source, args, context): Promise<PasswordAuthority> {
    const { pool, authorization: a, realm } = context;

    if (!a) {
      throw new ForbiddenError(
        "You must be authenticated to create a authority."
      );
    }

    const tx = await pool.connect();
    try {
      await tx.query("BEGIN DEFERRABLE");

      const id = v4();
      const data = new PasswordAuthority({
        id,
        strategy: "password",
        enabled: args.enabled,
        name: args.name,
        description: args.description,
        details: {
          rounds: args.rounds
        }
      });

      if (!(await data.isAccessibleBy(realm, a, tx, "write.*"))) {
        throw new ForbiddenError(
          "You do not have permission to create an authority."
        );
      }

      const authority = await PasswordAuthority.write(tx, data, {
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
  }
};
