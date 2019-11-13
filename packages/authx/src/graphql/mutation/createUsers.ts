import v4 from "uuid/v4";
import { GraphQLFieldConfig, GraphQLNonNull, GraphQLList } from "graphql";
import { isSuperset, simplify } from "@authx/scopes";
import { Context } from "../../Context";
import { GraphQLUser } from "../GraphQLUser";
import { User, UserType, Role } from "../../model";
import { validateIdFormat } from "../../util/validateIdFormat";
import {
  ForbiddenError,
  ConflictError,
  NotFoundError,
  ValidationError
} from "../../errors";
import { GraphQLCreateUserInput } from "./GraphQLCreateUserInput";

export const createUsers: GraphQLFieldConfig<
  any,
  {
    users: {
      id: null | string;
      type: UserType;
      enabled: boolean;
      name: string;
      administration: {
        roleId: string;
        scopes: string[];
      }[];
    }[];
  },
  Context
> = {
  type: new GraphQLList(GraphQLUser),
  description: "Create a new user.",
  args: {
    users: {
      type: new GraphQLNonNull(
        new GraphQLList(new GraphQLNonNull(GraphQLCreateUserInput))
      )
    }
  },
  async resolve(source, args, context): Promise<Promise<User>[]> {
    const { pool, authorization: a, realm } = context;

    if (!a) {
      throw new ForbiddenError("You must be authenticated to create a user.");
    }

    return args.users.map(async input => {
      // Validate `id`.
      if (typeof input.id === "string" && !validateIdFormat(input.id)) {
        throw new ValidationError("The provided `id` is an invalid ID.");
      }

      // Validate `administration`.
      for (const { roleId } of input.administration) {
        if (!validateIdFormat(roleId)) {
          throw new ValidationError(
            "The provided `administration` list contains a `roleId` that is an invalid ID."
          );
        }
      }

      /* eslint-disable @typescript-eslint/camelcase */
      const values: { [name: string]: null | string } = {
        current_authorization_id: a.id,
        current_user_id: a.userId,
        ...(a.grantId ? { current_grant_id: a.grantId } : null)
      };
      /* eslint-enable @typescript-eslint/camelcase */

      const tx = await pool.connect();
      try {
        // can create a new user
        if (!(await a.can(tx, values, `${realm}:user.......:*....`))) {
          throw new ForbiddenError(
            "You must be authenticated to create a user."
          );
        }

        try {
          await tx.query("BEGIN DEFERRABLE");

          // Make sure the ID isn't already in use.
          if (input.id) {
            try {
              await User.read(tx, input.id, { forUpdate: true });
              throw new ConflictError();
            } catch (error) {
              if (!(error instanceof NotFoundError)) {
                throw error;
              }
            }
          }

          const id = input.id || v4();
          const user = await User.write(
            tx,
            {
              id,
              enabled: input.enabled,
              type: input.type,
              name: input.name
            },
            {
              recordId: v4(),
              createdByAuthorizationId: a.id,
              createdAt: new Date()
            }
          );

          const possibleAdministrationScopes = [
            `${realm}:v2.user.......${id}:r....`,
            `${realm}:v2.user.......${id}:w....`,
            `${realm}:v2.user.......${id}:*....`,

            `${realm}:v2.grant...*..*..${id}:r....`,
            `${realm}:v2.grant...*..*..${id}:r...r.`,
            `${realm}:v2.grant...*..*..${id}:r..r..`,
            `${realm}:v2.grant...*..*..${id}:r..*.*.`,
            `${realm}:v2.grant...*..*..${id}:w....`,
            `${realm}:v2.grant...*..*..${id}:w...w.`,
            `${realm}:v2.grant...*..*..${id}:w..w..`,
            `${realm}:v2.grant...*..*..${id}:w..*.*.`,
            `${realm}:v2.grant...*..*..${id}:*..*.*.`,

            `${realm}:v2.authorization..*.*..*..${id}:r....`,
            `${realm}:v2.authorization..*.*..*..${id}:r..r..`,
            `${realm}:v2.authorization..*.*..*..${id}:r...r.`,
            `${realm}:v2.authorization..*.*..*..${id}:r..*.*.`,
            `${realm}:v2.authorization..*.*..*..${id}:w....`,
            `${realm}:v2.authorization..*.*..*..${id}:w..w..`,
            `${realm}:v2.authorization..*.*..*..${id}:w...w.`,
            `${realm}:v2.authorization..*.*..*..${id}:w..*.*.`,
            `${realm}:v2.authorization..*.*..*..${id}:*..*.*.`
          ];

          // Add administration scopes.
          for (const { roleId, scopes } of input.administration) {
            const role = await Role.read(tx, roleId, { forUpdate: true });

            if (!role.isAccessibleBy(realm, a, tx, "w..w..")) {
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
                  ...possibleAdministrationScopes.filter(possible =>
                    isSuperset(scopes, possible)
                  )
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
          return user;
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
