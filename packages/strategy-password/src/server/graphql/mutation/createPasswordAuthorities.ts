import v4 from "uuid/v4";
import { GraphQLList, GraphQLFieldConfig, GraphQLNonNull } from "graphql";

import { Context, ForbiddenError } from "@authx/authx";
import { PasswordAuthority } from "../../model";
import { GraphQLPasswordAuthority } from "../GraphQLPasswordAuthority";
import { GraphQLCreatePasswordAuthorityInput } from "./GraphQLCreatePasswordAuthorityInput";

export const createPasswordAuthorities: GraphQLFieldConfig<
  any,
  {
    authorities: {
      enabled: boolean;
      name: string;
      description: string;
      rounds: number;
    }[];
  },
  Context
> = {
  type: new GraphQLList(GraphQLPasswordAuthority),
  description: "Create a new password authority.",
  args: {
    authorities: {
      type: new GraphQLNonNull(
        new GraphQLList(new GraphQLNonNull(GraphQLCreatePasswordAuthorityInput))
      )
    }
  },
  async resolve(source, args, context): Promise<Promise<PasswordAuthority>[]> {
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

        const id = v4();
        const data = new PasswordAuthority({
          id,
          strategy: "password",
          enabled: input.enabled,
          name: input.name,
          description: input.description,
          details: {
            rounds: input.rounds
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
    });
  }
};
