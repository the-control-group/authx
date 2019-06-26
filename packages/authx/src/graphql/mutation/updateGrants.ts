import v4 from "uuid/v4";
import { randomBytes } from "crypto";
import { GraphQLFieldConfig, GraphQLList, GraphQLNonNull } from "graphql";

import { Context } from "../../Context";
import { GraphQLGrant } from "../GraphQLGrant";
import { Grant } from "../../model";
import { ForbiddenError } from "../../errors";
import { GraphQLUpdateGrantInput } from "./GraphQLUpdateGrantInput";

export const updateGrants: GraphQLFieldConfig<
  any,
  {
    grants: {
      id: string;
      enabled: null | boolean;
      scopes: null | string[];
      generateSecrets: null | number;
      removeSecrets: null | string[];
      generateCodes: null | number;
      removeCodes: null | string[];
    }[];
  },
  Context
> = {
  type: new GraphQLList(GraphQLGrant),
  description: "Update a new grant.",
  args: {
    grants: {
      type: new GraphQLNonNull(
        new GraphQLList(new GraphQLNonNull(GraphQLUpdateGrantInput))
      )
    }
  },
  async resolve(source, args, context): Promise<Promise<Grant>[]> {
    const { pool, authorization: a, realm, codeValidityDuration } = context;

    if (!a) {
      throw new ForbiddenError("You must be authenticated to update a grant.");
    }

    return args.grants.map(async input => {
      const tx = await pool.connect();
      try {
        await tx.query("BEGIN DEFERRABLE");
        const before = await Grant.read(tx, input.id);

        if (!(await before.isAccessibleBy(realm, a, tx, "write.basic"))) {
          throw new ForbiddenError(
            "You do not have permission to update this grant."
          );
        }

        if (
          input.scopes &&
          !(await before.isAccessibleBy(realm, a, tx, "write.scopes"))
        ) {
          throw new ForbiddenError(
            "You do not have permission to update this grant's scopes."
          );
        }

        if (
          (input.generateSecrets ||
            input.removeSecrets ||
            input.generateCodes ||
            input.removeCodes) &&
          !(await before.isAccessibleBy(realm, a, tx, "write.secrets"))
        ) {
          throw new ForbiddenError(
            "You do not have permission to update this grant's secrets."
          );
        }

        const now = Math.floor(Date.now() / 1000);
        let secrets = [...before.secrets];
        let codes = [...before.codes];

        // Generate secrets.
        if (input.generateSecrets) {
          for (let i = input.generateSecrets; i > 0; i--) {
            secrets.push(
              Buffer.from(
                [before.id, now, randomBytes(16).toString("hex")].join(":")
              ).toString("base64")
            );
          }
        }

        // Remove secrets.
        if (input.removeSecrets) {
          const removeSecrets = new Set(input.removeSecrets);
          secrets = secrets.filter(id => !removeSecrets.has(id));
        }

        // Make sure we have at least one secret.
        if (!secrets.length) {
          secrets.push(
            Buffer.from(
              [before.id, now, randomBytes(16).toString("hex")].join(":")
            ).toString("base64")
          );
        }

        // Generate codes.
        if (input.generateCodes) {
          for (let i = input.generateCodes; i > 0; i--) {
            codes.push(
              Buffer.from(
                [before.id, now, randomBytes(16).toString("hex")].join(":")
              ).toString("base64")
            );
          }
        }

        // Remove codes.
        if (input.removeCodes) {
          const removeCodes = new Set(input.removeCodes);
          codes = codes.filter(id => !removeCodes.has(id));
        }

        // Prune expired codes.
        if (input.generateCodes || input.removeCodes) {
          codes = codes.filter(code => {
            const issued = Buffer.from(code, "base64")
              .toString("utf8")
              .split(":")[1];
            return issued && parseInt(issued) + codeValidityDuration > now;
          });
        }

        const grant = await Grant.write(
          tx,
          {
            ...before,
            enabled:
              typeof input.enabled === "boolean"
                ? input.enabled
                : before.enabled,
            secrets,
            codes,
            scopes: input.scopes || before.scopes
          },
          {
            recordId: v4(),
            createdByAuthorizationId: a.id,
            createdAt: new Date()
          }
        );

        await tx.query("COMMIT");
        return grant;
      } catch (error) {
        await tx.query("ROLLBACK");
        throw error;
      } finally {
        tx.release();
      }
    });
  }
};
