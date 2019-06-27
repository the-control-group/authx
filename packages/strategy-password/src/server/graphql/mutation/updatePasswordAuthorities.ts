import v4 from "uuid/v4";
import { GraphQLList, GraphQLFieldConfig, GraphQLNonNull } from "graphql";

import {
  Context,
  Authority,
  ForbiddenError,
  NotFoundError
} from "@authx/authx";
import { PasswordAuthority } from "../../model";
import { GraphQLPasswordAuthority } from "../GraphQLPasswordAuthority";
import { GraphQLUpdatePasswordAuthorityInput } from "./GraphQLUpdatePasswordAuthorityInput";

export const updatePasswordAuthorities: GraphQLFieldConfig<
  any,
  {
    authorities: {
      id: string;
      enabled: null | boolean;
      name: null | string;
      description: null | string;
      rounds: null | number;
    }[];
  },
  Context
> = {
  type: new GraphQLList(GraphQLPasswordAuthority),
  description: "Update a new authority.",
  args: {
    authorities: {
      type: new GraphQLNonNull(
        new GraphQLList(new GraphQLNonNull(GraphQLUpdatePasswordAuthorityInput))
      )
    }
  },
  async resolve(source, args, context): Promise<Promise<PasswordAuthority>[]> {
    const {
      pool,
      authorization: a,
      realm,
      strategies: { authorityMap }
    } = context;

    if (!a) {
      throw new ForbiddenError(
        "You must be authenticated to update an authority."
      );
    }

    return args.authorities.map(async input => {
      const tx = await pool.connect();
      try {
        await tx.query("BEGIN DEFERRABLE");

        const before = await Authority.read(tx, input.id, authorityMap, {
          forUpdate: true
        });

        if (!(before instanceof PasswordAuthority)) {
          throw new NotFoundError("No password authority exists with this ID.");
        }

        if (!(await before.isAccessibleBy(realm, a, tx, "write.basic"))) {
          throw new ForbiddenError(
            "You do not have permission to update this authority."
          );
        }

        if (
          typeof input.rounds === "number" &&
          !(await before.isAccessibleBy(realm, a, tx, "write.*"))
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
              typeof input.enabled === "boolean"
                ? input.enabled
                : before.enabled,
            name: typeof input.name === "string" ? input.name : before.name,
            description:
              typeof input.description === "string"
                ? input.description
                : before.description,
            details: {
              ...before.details,
              rounds:
                typeof input.rounds === "number"
                  ? input.rounds
                  : before.details.rounds
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
      } finally {
        tx.release();
      }
    });
  }
};
