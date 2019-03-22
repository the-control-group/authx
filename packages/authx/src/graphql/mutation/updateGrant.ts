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

import { Context } from "../Context";
import { GraphQLGrant } from "../GraphQLGrant";
import { Grant } from "../../model";
import { ForbiddenError } from "../../errors";

export const updateGrant: GraphQLFieldConfig<
  any,
  {
    id: string;
    enabled: null | boolean;
    scopes: null | string[];
    generateSecret: boolean;
    generateNonces: null | number;
    removeNonces: null | string[];
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
    generateSecret: {
      type: GraphQLBoolean,
      defaultValue: false
    },
    generateNonces: {
      type: GraphQLInt
    },
    removeNonces: {
      type: new GraphQLList(new GraphQLNonNull(GraphQLString))
    }
  },
  async resolve(source, args, context): Promise<Grant> {
    const { tx, token: t, realm } = context;

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
        (args.generateSecret || args.generateNonces || args.removeNonces) &&
        !(await before.isAccessibleBy(realm, t, tx, "write.secrets"))
      ) {
        throw new ForbiddenError(
          "You do not have permission to update this grant's secrets."
        );
      }

      const now = Date.now();
      let nonces = [...before.nonces];

      // Prune expired nonces
      if (args.generateNonces || args.removeNonces) {
        nonces = nonces.filter(nonce => {
          const expiration = nonce.split(":")[1];
          return expiration && parseInt(expiration) > now;
        });
      }

      // Generate nonces
      if (args.generateNonces) {
        for (let i = args.generateNonces; i > 0; i--) {
          nonces.push(
            Buffer.from(
              [
                before.id,
                now + 1000 * 60 * 5,
                randomBytes(16).toString("hex")
              ].join(":")
            ).toString("base64")
          );
        }
      }

      // Remove nonces
      if (args.removeNonces) {
        const removeNonces = new Set(args.removeNonces);
        nonces = nonces.filter(id => !removeNonces.has(id));
      }

      const grant = await Grant.write(
        tx,
        {
          ...before,
          enabled:
            typeof args.enabled === "boolean" ? args.enabled : before.enabled,
          secret: args.generateSecret
            ? randomBytes(16).toString("hex")
            : before.secret,
          nonces,
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
