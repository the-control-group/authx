import {
  GraphQLFieldConfig,
  GraphQLID,
  GraphQLNonNull,
  GraphQLString,
} from "graphql";

import { Pool, PoolClient } from "pg";
import { randomBytes } from "crypto";
import { compare } from "bcrypt";
import { v4 } from "uuid";

import {
  Context,
  GraphQLAuthorization,
  Authority,
  Authorization,
  ForbiddenError,
  AuthenticationError,
  User,
  DataLoaderExecutor,
  ReadonlyDataLoaderExecutor,
} from "@authx/authx";

import { createV2AuthXScope } from "@authx/authx/scopes.js";

import { isSuperset } from "@authx/scopes";
import { PasswordAuthority } from "../../model/index.js";
const __DEV__ = process.env.NODE_ENV !== "production";

export const authenticatePassword: GraphQLFieldConfig<
  any,
  Context,
  {
    identityAuthorityId: string;
    identityAuthorityUserId: string;
    passwordAuthorityId: string;
    password: string;
  }
> = {
  type: GraphQLAuthorization,
  description: "Create a new authorization.",
  args: {
    identityAuthorityId: {
      type: new GraphQLNonNull(GraphQLID),
    },
    identityAuthorityUserId: {
      type: new GraphQLNonNull(GraphQLString),
    },
    passwordAuthorityId: {
      type: new GraphQLNonNull(GraphQLID),
    },
    password: {
      type: new GraphQLNonNull(GraphQLString),
    },
  },
  async resolve(source, args, context): Promise<Authorization> {
    const { executor, authorization: a, realm } = context;

    if (a) {
      throw new ForbiddenError("You area already authenticated.");
    }

    const strategies = executor.strategies;
    const pool = executor.connection;
    if (!(pool instanceof Pool)) {
      throw new Error(
        "INVARIANT: The executor connection is expected to be an instance of Pool."
      );
    }

    const tx = await pool.connect();
    try {
      // Make sure this transaction is used for queries made by the executor.
      const executor = new DataLoaderExecutor<Pool | PoolClient>(
        tx,
        strategies
      );

      await tx.query("BEGIN DEFERRABLE");

      // Fetch the authority.
      const authority = await Authority.read(
        tx,
        args.passwordAuthorityId,
        strategies
      );

      if (!(authority instanceof PasswordAuthority)) {
        throw new AuthenticationError(
          __DEV__
            ? "The authority uses a strategy other than password."
            : undefined
        );
      }

      // Find the user ID given identityAuthorityId and identityAuthorityUserId.
      let userId: string | null;
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

      // Get the credential.
      const credential = await authority.credential(executor, userId);

      if (!credential) {
        throw new AuthenticationError(
          __DEV__ ? "No such credential exists." : undefined
        );
      }

      // Check the password.
      if (!(await compare(args.password, credential.details.hash))) {
        throw new AuthenticationError(
          __DEV__ ? "The password is incorrect." : undefined
        );
      }

      context.rateLimiter.limit(credential.id);

      // Invoke the credential.
      await credential.invoke(executor, {
        id: v4(),
        createdAt: new Date(),
      });

      const authorizationId = v4();

      const values = {
        currentAuthorizationId: authorizationId,
        currentUserId: credential.userId,
        currentGrantId: null,
        currentClientId: null,
      };

      // Make sure the user can create new authorizations.
      const user = await User.read(executor, credential.userId);
      if (
        !isSuperset(
          await user.access(executor, values),
          createV2AuthXScope(
            realm,
            {
              type: "authorization",
              authorizationId: "",
              grantId: "",
              clientId: "",
              userId: user.id,
            },
            {
              basic: "*",
              scopes: "*",
              secrets: "*",
            }
          )
        )
      ) {
        throw new ForbiddenError(
          "You do not have permission to create this authorization"
        );
      }

      // Create a new authorization.
      const authorization = await Authorization.write(
        tx,
        {
          id: authorizationId,
          enabled: true,
          userId,
          grantId: null,
          secret: randomBytes(16).toString("hex"),
          scopes: [`${realm}:**:**`],
        },
        {
          recordId: v4(),
          createdByAuthorizationId: authorizationId,
          createdByCredentialId: credential.id,
          createdAt: new Date(),
        }
      );

      // Invoke the new authorization, since it will be used for the remainder
      // of the request.
      await authorization.invoke(executor, {
        id: v4(),
        format: "basic",
        createdAt: new Date(),
      });

      await tx.query("COMMIT");

      // Clear and prime the loader.
      Authorization.clear(executor, authorization.id);
      Authorization.prime(executor, authorization.id, authorization);

      // Update the context to use a new executor primed with the results of
      // this mutation, using the original connection pool.
      executor.connection = pool;
      context.executor = executor as ReadonlyDataLoaderExecutor<Pool>;

      // Use this authorization for the rest of the request.
      context.authorization = authorization;

      return authorization;
    } catch (error) {
      await tx.query("ROLLBACK");
      throw error;
    } finally {
      tx.release();
    }
  },
};
