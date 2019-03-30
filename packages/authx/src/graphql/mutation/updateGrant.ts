import v4 from "uuid/v4";
import { randomBytes } from "crypto";
import {
  GraphQLBoolean,
  GraphQLFieldConfig,
  GraphQLID,
  GraphQLList,
  GraphQLNonNull,
  GraphQLInt,
  GraphQLString
} from "graphql";

import { Context } from "../../Context";
import { GraphQLGrant } from "../GraphQLGrant";
import { Grant } from "../../model";
import { ForbiddenError } from "../../errors";

export const updateGrant: GraphQLFieldConfig<
  any,
  {
    id: string;
    enabled: null | boolean;
    scopes: null | string[];
    generateSecrets: null | number;
    removeSecrets: null | string[];
    generateCodes: null | number;
    removeCodes: null | string[];
  },
  Context
> = {
  type: GraphQLGrant,
  description: "Update a new grant.",
  args: {
    id: {
      type: new GraphQLNonNull(GraphQLID)
    },
    enabled: {
      type: GraphQLBoolean
    },
    scopes: {
      type: new GraphQLList(new GraphQLNonNull(GraphQLString))
    },
    generateSecrets: {
      type: GraphQLInt
    },
    removeSecrets: {
      type: new GraphQLList(new GraphQLNonNull(GraphQLString))
    },
    generateCodes: {
      type: GraphQLInt
    },
    removeCodes: {
      type: new GraphQLList(new GraphQLNonNull(GraphQLString))
    }
  },
  async resolve(source, args, context): Promise<Grant> {
    const { tx, token: t, realm, codeValidityDuration } = context;

    if (!t) {
      throw new ForbiddenError("You must be authenticated to update a grant.");
    }

    await tx.query("BEGIN DEFERRABLE");

    try {
      const before = await Grant.read(tx, args.id);

      if (!(await before.isAccessibleBy(realm, t, tx, "write.basic"))) {
        throw new ForbiddenError(
          "You do not have permission to update this grant."
        );
      }

      if (
        args.scopes &&
        !(await before.isAccessibleBy(realm, t, tx, "write.scopes"))
      ) {
        throw new ForbiddenError(
          "You do not have permission to update this grant's scopes."
        );
      }

      if (
        (args.generateSecrets ||
          args.removeSecrets ||
          args.generateCodes ||
          args.removeCodes) &&
        !(await before.isAccessibleBy(realm, t, tx, "write.secrets"))
      ) {
        throw new ForbiddenError(
          "You do not have permission to update this grant's secrets."
        );
      }

      const now = Math.floor(Date.now() / 1000);
      let secrets = [...before.secrets];
      let codes = [...before.codes];

      // Generate secrets.
      if (args.generateSecrets) {
        for (let i = args.generateSecrets; i > 0; i--) {
          secrets.push(
            Buffer.from(
              [before.id, now, randomBytes(16).toString("hex")].join(":")
            ).toString("base64")
          );
        }
      }

      // Remove secrets.
      if (args.removeSecrets) {
        const removeSecrets = new Set(args.removeSecrets);
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
      if (args.generateCodes) {
        for (let i = args.generateCodes; i > 0; i--) {
          codes.push(
            Buffer.from(
              [before.id, now, randomBytes(16).toString("hex")].join(":")
            ).toString("base64")
          );
        }
      }

      // Remove codes.
      if (args.removeCodes) {
        const removeCodes = new Set(args.removeCodes);
        codes = codes.filter(id => !removeCodes.has(id));
      }

      // Prune expired codes.
      if (args.generateCodes || args.removeCodes) {
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
            typeof args.enabled === "boolean" ? args.enabled : before.enabled,
          secrets,
          codes,
          scopes: args.scopes || before.scopes
        },
        {
          recordId: v4(),
          createdByTokenId: t.id,
          createdAt: new Date()
        }
      );

      await tx.query("COMMIT");
      return grant;
    } catch (error) {
      await tx.query("ROLLBACK");
      throw error;
    }
  }
};
