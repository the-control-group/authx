import v4 from "uuid/v4";
import { randomBytes } from "crypto";
import { isSuperset, simplify } from "@authx/scopes";
import { GraphQLFieldConfig, GraphQLList, GraphQLNonNull } from "graphql";
import { Context } from "../../Context";
import { GraphQLGrant } from "../GraphQLGrant";
import { Grant, Role } from "../../model";
import { validateIdFormat } from "../../util/validateIdFormat";
import {
  ForbiddenError,
  ConflictError,
  NotFoundError,
  ValidationError
} from "../../errors";
import { GraphQLCreateGrantInput } from "./GraphQLCreateGrantInput";

export const createGrants: GraphQLFieldConfig<
  any,
  {
    grants: {
      id: null | string;
      enabled: boolean;
      userId: string;
      clientId: string;
      scopes: string[];
      administration: {
        roleId: string;
        scopes: string[];
      }[];
    }[];
  },
  Context
> = {
  type: new GraphQLList(GraphQLGrant),
  description: "Create a new grant.",
  args: {
    grants: {
      type: new GraphQLNonNull(
        new GraphQLList(new GraphQLNonNull(GraphQLCreateGrantInput))
      )
    }
  },
  async resolve(source, args, context): Promise<Promise<Grant>[]> {
    const { pool, authorization: a, realm } = context;

    if (!a) {
      throw new ForbiddenError("You must be authenticated to create a grant.");
    }

    return args.grants.map(async input => {
      // Validate `id`.
      if (typeof input.id === "string" && !validateIdFormat(input.id)) {
        throw new ValidationError("The provided `id` is an invalid ID.");
      }

      // Validate `userId`.
      if (!validateIdFormat(input.userId)) {
        throw new ValidationError("The provided `userId` is an invalid ID.");
      }

      // Validate `clientId`.
      if (!validateIdFormat(input.clientId)) {
        throw new ValidationError("The provided `clientId` is an invalid ID.");
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
        if (
          !(await a.can(
            tx,
            values,
            `${realm}:grant...${input.clientId}....${input.userId}:*..*.*.`
          ))
        ) {
          throw new ForbiddenError(
            "You do not have permission to create this grant."
          );
        }

        try {
          await tx.query("BEGIN DEFERRABLE");

          // Make sure the ID isn't already in use.
          if (input.id) {
            try {
              await Grant.read(tx, input.id, { forUpdate: true });
              throw new ConflictError();
            } catch (error) {
              if (!(error instanceof NotFoundError)) {
                throw error;
              }
            }
          }

          const id = input.id || v4();
          const now = Math.floor(Date.now() / 1000);
          const grant = await Grant.write(
            tx,
            {
              id,
              enabled: input.enabled,
              userId: input.userId,
              clientId: input.clientId,
              secrets: [
                Buffer.from(
                  [id, now, randomBytes(16).toString("hex")].join(":")
                ).toString("base64")
              ],
              codes: [
                Buffer.from(
                  [id, now, randomBytes(16).toString("hex")].join(":")
                ).toString("base64")
              ],
              scopes: input.scopes
            },
            {
              recordId: v4(),
              createdByAuthorizationId: a.id,
              createdAt: new Date()
            }
          );

          const possibleAdministrationScopes = [
            `${realm}:v2.grant...${grant.clientId}..${id}..${grant.userId}:r....`,
            `${realm}:v2.grant...${grant.clientId}..${id}..${grant.userId}:r...r.`,
            `${realm}:v2.grant...${grant.clientId}..${id}..${grant.userId}:r..r..`,
            `${realm}:v2.grant...${grant.clientId}..${id}..${grant.userId}:r..*.*.`,
            `${realm}:v2.grant...${grant.clientId}..${id}..${grant.userId}:w....`,
            `${realm}:v2.grant...${grant.clientId}..${id}..${grant.userId}:w...w.`,
            `${realm}:v2.grant...${grant.clientId}..${id}..${grant.userId}:w..w..`,
            `${realm}:v2.grant...${grant.clientId}..${id}..${grant.userId}:w..*.*.`,
            `${realm}:v2.grant...${grant.clientId}..${id}..${grant.userId}:*..*.*.`,

            `${realm}:v2.authorization..*.${grant.clientId}..${id}..${grant.userId}:r....`,
            `${realm}:v2.authorization..*.${grant.clientId}..${id}..${grant.userId}:r..r..`,
            `${realm}:v2.authorization..*.${grant.clientId}..${id}..${grant.userId}:r...r.`,
            `${realm}:v2.authorization..*.${grant.clientId}..${id}..${grant.userId}:r..*.*.`,
            `${realm}:v2.authorization..*.${grant.clientId}..${id}..${grant.userId}:w....`,
            `${realm}:v2.authorization..*.${grant.clientId}..${id}..${grant.userId}:w..w..`,
            `${realm}:v2.authorization..*.${grant.clientId}..${id}..${grant.userId}:w...w.`,
            `${realm}:v2.authorization..*.${grant.clientId}..${id}..${grant.userId}:w..*.*.`,
            `${realm}:v2.authorization..*.${grant.clientId}..${id}..${grant.userId}:*..*.*.`
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
          return grant;
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
