import v4 from "uuid/v4";
import {
  GraphQLBoolean,
  GraphQLFieldConfig,
  GraphQLNonNull,
  GraphQLInt,
  GraphQLString,
  GraphQLInputObjectType
} from "graphql";

import { Context } from "../../../../graphql/Context";
import { PasswordAuthority } from "../../model";
import { ForbiddenError } from "../../../../errors";
import { GraphQLPasswordAuthority } from "../GraphQLPasswordAuthority";

export const GraphQLCreatePasswordAuthorityDetailsInput = new GraphQLInputObjectType(
  {
    name: "CreatePasswordAuthorityDetailsInput",
    fields: () => ({
      rounds: {
        type: GraphQLInt,
        defaultValue: 10,
        description:
          "The number of bcrypt rounds to use when generating new hashes."
      }
    })
  }
);

export const createPasswordAuthority: GraphQLFieldConfig<
  any,
  {
    enabled: boolean;
    name: string;
    details: {
      rounds: number;
    };
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
    details: {
      type: new GraphQLNonNull(GraphQLCreatePasswordAuthorityDetailsInput),
      description: "Authority details, specific to the password strategy."
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
        details: args.details
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
