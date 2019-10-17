import v4 from "uuid/v4";
import { GraphQLList, GraphQLFieldConfig, GraphQLNonNull } from "graphql";

import {
  Context,
  ForbiddenError,
  ConflictError,
  NotFoundError,
  Role,
  makeAdministrationScopes
} from "@authx/authx";
import { getIntersection, simplify } from "@authx/scopes";
import { PasswordAuthority } from "../../model";
import { GraphQLPasswordAuthority } from "../GraphQLPasswordAuthority";
import { GraphQLCreatePasswordAuthorityInput } from "./GraphQLCreatePasswordAuthorityInput";

export const createPasswordAuthorities: GraphQLFieldConfig<
  any,
  {
    authorities: {
      id: null | string;
      enabled: boolean;
      name: string;
      description: string;
      rounds: number;
      administration: {
        roleId: string;
        scopes: string[];
      }[];
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
        if (!(await a.can(tx, `${realm}:authority.:write.create`))) {
          throw new ForbiddenError(
            "You do not have permission to create an authority."
          );
        }

        try {
          await tx.query("BEGIN DEFERRABLE");

          // Make sure the ID isn't already in use.
          if (input.id) {
            try {
              await PasswordAuthority.read(tx, input.id, { forUpdate: true });
              throw new ConflictError();
            } catch (error) {
              if (!(error instanceof NotFoundError)) {
                throw error;
              }
            }
          }

          const id = v4();
          const authority = await PasswordAuthority.write(
            tx,
            {
              id,
              strategy: "password",
              enabled: input.enabled,
              name: input.name,
              description: input.description,
              details: {
                rounds: input.rounds
              }
            },
            {
              recordId: v4(),
              createdByAuthorizationId: a.id,
              createdAt: new Date()
            }
          );

          const possibleAdministrationScopes = makeAdministrationScopes(
            await a.access(tx),
            realm,
            "client",
            id,
            ["read.basic", "read.details", "write.basic", "write.details"]
          );

          // Add administration scopes.
          for (const { roleId, scopes } of input.administration) {
            const role = await Role.read(tx, roleId, { forUpdate: true });

            if (!role.can(tx, "write.scopes")) {
              throw new ForbiddenError(
                `You do not have permission to modify the scopes of role ${roleId}.`
              );
            }

            await Role.write(
              tx,
              {
                ...role,
                scopes: simplify([
                  ...role.scopes,
                  ...getIntersection(possibleAdministrationScopes, scopes)
                ])
              },
              {
                recordId: v4(),
                createdByAuthorizationId: a.id,
                createdAt: new Date()
              }
            );
          }

          await tx.query("COMMIT");
          return authority;
        } catch (error) {
          await tx.query("ROLLBACK");
          throw error;
        }
      } finally {
        tx.release();
      }
    });
  }
};
