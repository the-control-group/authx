import {
  GraphQLFieldConfig,
  GraphQLID,
  GraphQLNonNull,
  GraphQLString
} from "graphql";

import { randomBytes } from "crypto";
import { compare } from "bcrypt";
import v4 from "uuid/v4";

import {
  Context,
  GraphQLAuthorization,
  Authority,
  Authorization,
  ForbiddenError,
  AuthenticationError
} from "@authx/authx";

import { PasswordAuthority } from "../../model";

const __DEV__ = process.env.NODE_ENV !== "production";

export const authenticatePassword: GraphQLFieldConfig<
  any,
  {
    identityAuthorityId: string;
    identityAuthorityUserId: string;
    passwordAuthorityId: string;
    password: string;
  },
  Context
> = {
  type: GraphQLAuthorization,
  description: "Create a new authorization.",
  args: {
    identityAuthorityId: {
      type: new GraphQLNonNull(GraphQLID)
    },
    identityAuthorityUserId: {
      type: new GraphQLNonNull(GraphQLString)
    },
    passwordAuthorityId: {
      type: new GraphQLNonNull(GraphQLID)
    },
    password: {
      type: new GraphQLNonNull(GraphQLString)
    }
  },
  async resolve(source, args, context): Promise<Authorization> {
    const {
      pool,
      authorization: a,
      realm,
      strategies: { authorityMap }
    } = context;

    if (a) {
      throw new ForbiddenError("You area already authenticated.");
    }

    const tx = await pool.connect();
    try {
      await tx.query("BEGIN DEFERRABLE");

      try {
        // fetch the authority
        const authority = await Authority.read(
          tx,
          args.passwordAuthorityId,
          authorityMap
        );

        if (!(authority instanceof PasswordAuthority)) {
          throw new AuthenticationError(
            __DEV__
              ? "The authority uses a strategy other than password."
              : undefined
          );
        }

        // find the user ID given identityAuthorityId and identityAuthorityUserId
        var userId: string | null;
        if (args.identityAuthorityId === authority.id) {
          userId = args.identityAuthorityUserId;
        } else {
          const results = await tx.query(
            `
          SELECT user_id
          FROM authx.credential_record
          WHERE
            authority_id = $1
            AND authority_user_id = $2
            AND enabled = true
            AND replacement_record_id IS NULL
        `,
            [args.identityAuthorityId, args.identityAuthorityUserId]
          );

          if (results.rows.length > 1) {
            throw new Error(
              "INVARIANT: There cannot be more than one active credential with the same authorityId and authorityUserId."
            );
          }

          userId = results.rows.length ? results.rows[0].user_id : null;
        }

        if (!userId) {
          throw new AuthenticationError(
            __DEV__ ? "Unable to find user identity." : undefined
          );
        }

        // get the credential
        const credential = await authority.credential(tx, userId);

        if (!credential) {
          throw new AuthenticationError(
            __DEV__ ? "No such credential exists." : undefined
          );
        }

        // check the password
        if (!(await compare(args.password, credential.details.hash))) {
          throw new AuthenticationError(
            __DEV__ ? "The password is incorrect." : undefined
          );
        }

        // create a new authorization
        const authorizationId = v4();
        const authorization = await Authorization.write(
          tx,
          {
            id: authorizationId,
            enabled: true,
            userId,
            grantId: null,
            secret: randomBytes(16).toString("hex"),
            scopes: [`${realm}:**:**`]
          },
          {
            recordId: v4(),
            createdByAuthorizationId: authorizationId,
            createdByCredentialId: credential.id,
            createdAt: new Date()
          }
        );

        await tx.query("COMMIT");

        // use this authorization for the rest of the request
        context.authorization = authorization;

        return authorization;
      } catch (error) {
        await tx.query("ROLLBACK");
        throw error;
      }
    } finally {
      tx.release();
    }
  }
};
