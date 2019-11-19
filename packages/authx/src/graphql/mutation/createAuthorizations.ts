import v4 from "uuid/v4";
import { randomBytes } from "crypto";
import { isSuperset, simplify, getIntersection } from "@authx/scopes";
import { GraphQLFieldConfig, GraphQLList, GraphQLNonNull } from "graphql";
import { Context } from "../../Context";
import { GraphQLAuthorization } from "../GraphQLAuthorization";
import { Authorization, Grant, Role } from "../../model";
import { validateIdFormat } from "../../util/validateIdFormat";
import {
  ForbiddenError,
  ConflictError,
  NotFoundError,
  ValidationError
} from "../../errors";
import { GraphQLCreateAuthorizationInput } from "./GraphQLCreateAuthorizationInput";

export const createAuthorizations: GraphQLFieldConfig<
  any,
  {
    authorizations: {
      id: null | string;
      enabled: boolean;
      userId: string;
      grantId: null | string;
      scopes: string[];
      administration: {
        roleId: string;
        scopes: string[];
      }[];
    }[];
  },
  Context
> = {
  type: new GraphQLList(GraphQLAuthorization),
  description: "Create a new authorization.",
  args: {
    authorizations: {
      type: new GraphQLNonNull(
        new GraphQLList(new GraphQLNonNull(GraphQLCreateAuthorizationInput))
      )
    }
  },
  async resolve(source, args, context): Promise<Promise<Authorization>[]> {
    const { pool, authorization: a, realm } = context;

    if (!a) {
      throw new ForbiddenError(
        "You must be authenticated to create an authorization."
      );
    }

    return args.authorizations.map(async input => {
      // Validate `id`.
      if (typeof input.id === "string" && !validateIdFormat(input.id)) {
        throw new ValidationError("The provided `id` is an invalid ID.");
      }

      // Validate `userId`.
      if (!validateIdFormat(input.userId)) {
        throw new ValidationError("The provided `userId` is an invalid ID.");
      }

      // Validate `grantId`.
      if (
        typeof input.grantId === "string" &&
        !validateIdFormat(input.grantId)
      ) {
        throw new ValidationError("The provided `grantId` is an invalid ID.");
      }

      // Validate `administration`.
      for (const { roleId } of input.administration) {
        if (!validateIdFormat(roleId)) {
          throw new ValidationError(
            "The provided `administration` list contains a `roleId` that is an invalid ID."
          );
        }
      }

      const tx = await pool.connect();
      try {
        /* eslint-disable @typescript-eslint/camelcase */
        const values: { [name: string]: null | string } = {
          current_authorization_id: a.id,
          current_user_id: a.userId,
          current_grant_id: a.grantId ?? null,
          current_client_id: (await a.grant(tx))?.clientId ?? null
        };
        /* eslint-enable @typescript-eslint/camelcase */

        const grant = input.grantId
          ? await Grant.read(tx, input.grantId)
          : null;
        if (
          !(await a.can(
            tx,
            values,
            `${realm}:v2.authorization...${(grant && grant.clientId) ||
              ""}..${(grant && grant.id) || ""}..${input.userId}:*..*.*.`
          ))
        ) {
          throw new ForbiddenError(
            "You do not have permission to create this authorization."
          );
        }

        try {
          await tx.query("BEGIN DEFERRABLE");

          // Make sure the ID isn't already in use.
          if (input.id) {
            try {
              await Authorization.read(tx, input.id, { forUpdate: true });
              throw new ConflictError();
            } catch (error) {
              if (!(error instanceof NotFoundError)) {
                throw error;
              }
            }
          }

          const id = input.id || v4();
          const authorization = await Authorization.write(
            tx,
            {
              id,
              enabled: input.enabled,
              userId: input.userId,
              grantId: input.grantId,
              secret: randomBytes(16).toString("hex"),
              scopes: getIntersection(
                input.scopes,
                grant
                  ? await grant.access(tx, values)
                  : await (await a.user(tx)).access(tx, values)
              )
            },
            {
              recordId: v4(),
              createdByAuthorizationId: a.id,
              createdByCredentialId: null,
              createdAt: new Date()
            }
          );

          const possibleAdministrationScopes = [
            `${realm}:v2.authorization..${id}.${(grant && grant.clientId) ||
              ""}..${(grant && grant.id) || ""}..*:r....`,
            `${realm}:v2.authorization..${id}.${(grant && grant.clientId) ||
              ""}..${(grant && grant.id) || ""}..*:r...r.`,
            `${realm}:v2.authorization..${id}.${(grant && grant.clientId) ||
              ""}..${(grant && grant.id) || ""}..*:r..r..`,
            `${realm}:v2.authorization..${id}.${(grant && grant.clientId) ||
              ""}..${(grant && grant.id) || ""}..*:r..*.*.`,
            `${realm}:v2.authorization..${id}.${(grant && grant.clientId) ||
              ""}..${(grant && grant.id) || ""}..*:w....`,
            `${realm}:v2.authorization..${id}.${(grant && grant.clientId) ||
              ""}..${(grant && grant.id) || ""}..*:*..*.*.`
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
          return authorization;
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
